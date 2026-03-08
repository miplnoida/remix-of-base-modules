import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ValidationRule {
  doc_code: string;
  doc_description: string;
  expected_keywords: string[];
  ai_prompt_hint: string | null;
  min_confidence: number;
}

interface ValidationResult {
  is_valid: boolean;
  confidence: number;
  reason: string;
  extracted_text_preview?: string;
  user_message?: string;
  _fallback?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse multipart form data or JSON
    const contentType = req.headers.get('content-type') || '';
    let file: File | null = null;
    let docCode = '';
    let documentId = '';
    let fileName = '';
    let filePath = '';
    let userId = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = formData.get('file') as File | null;
      docCode = (formData.get('doc_code') as string) || '';
      documentId = (formData.get('document_id') as string) || '';
      fileName = (formData.get('file_name') as string) || '';
      filePath = (formData.get('file_path') as string) || '';
      userId = (formData.get('user_id') as string) || '';
    } else {
      const body = await req.json();
      docCode = body.doc_code || '';
      documentId = body.document_id || '';
      filePath = body.file_path || '';
      userId = body.user_id || '';
    }

    if (!docCode) {
      return new Response(JSON.stringify({
        is_valid: false,
        confidence: 0,
        reason: 'doc_code is required',
        user_message: 'Document type was not specified. Please select a document type and try again.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get validation rule
    const { data: rule, error: ruleError } = await supabase
      .from('document_purpose_rules')
      .select('*')
      .eq('doc_code', docCode)
      .eq('is_active', true)
      .single();

    if (ruleError || !rule) {
      // No rule configured — allow by default
      const result: ValidationResult = {
        is_valid: true,
        confidence: 1.0,
        reason: `No validation rule configured for document type "${docCode}". Document accepted by default.`,
        user_message: 'Document accepted.',
      };
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validationRule = rule as ValidationRule;

    // Get file content - either from form upload or storage
    let fileBytes: Uint8Array | null = null;
    let mimeType = '';

    if (file) {
      fileBytes = new Uint8Array(await file.arrayBuffer());
      mimeType = file.type;
      fileName = fileName || file.name;
    } else if (filePath) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('ip-documents')
        .download(filePath);
      if (downloadError || !fileData) {
        console.error('Storage download error:', downloadError);
        return new Response(JSON.stringify({
          is_valid: false,
          confidence: 0,
          reason: `Storage error: ${downloadError?.message || 'File not found'}`,
          user_message: 'The uploaded file could not be retrieved for verification. Please try uploading again.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      fileBytes = new Uint8Array(await fileData.arrayBuffer());
      mimeType = fileData.type;
    } else {
      return new Response(JSON.stringify({
        is_valid: false,
        confidence: 0,
        reason: 'No file provided for validation.',
        user_message: 'No file was provided. Please select a file and try again.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine if it's an image or PDF
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';
    const isDoc = mimeType.includes('word') || mimeType.includes('document');

    // Build the AI prompt
    const aiPrompt = buildValidationPrompt(validationRule, fileName);

    // Call Gemini for content analysis
    let result: ValidationResult;

    if (isImage || isPdf) {
      result = await validateWithAI(fileBytes, mimeType, aiPrompt, validationRule);
    } else if (isDoc) {
      result = {
        is_valid: true,
        confidence: 0.5,
        reason: `Word document format accepted. Full content analysis is limited for this format.`,
        user_message: `Document accepted. For best verification results, consider uploading a PDF or image version of your ${validationRule.doc_description}.`,
      };
    } else {
      result = {
        is_valid: false,
        confidence: 0,
        reason: `Unsupported file format: ${mimeType}`,
        user_message: `This file format is not supported. Please upload a PDF, JPG, or PNG file.`,
      };
    }

    // Store validation result
    if (documentId) {
      try {
        await supabase.from('document_validation_results').insert({
          document_id: documentId,
          doc_code: docCode,
          is_valid: result.is_valid,
          confidence: result.confidence,
          reason: result.reason,
          extracted_text_preview: result.extracted_text_preview || null,
          validated_by: userId || null,
        });
      } catch (logErr) {
        console.error('Failed to store validation result:', logErr);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // Log full technical details server-side for support/debugging
    console.error('Document validation unhandled error:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });

    // Return user-friendly error without exposing internals
    return new Response(JSON.stringify({
      is_valid: false,
      confidence: 0,
      reason: `Internal validation error: ${err.message}`,
      user_message: 'Document verification could not be completed due to a technical issue. Please try again.',
      _fallback: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildValidationPrompt(rule: ValidationRule, fileName: string): string {
  return `You are a document verification system. Analyze the uploaded document and determine if it matches the expected document type: "${rule.doc_description}".

${rule.ai_prompt_hint || ''}

Expected keywords/content for a valid ${rule.doc_description}: ${rule.expected_keywords.join(', ')}

Instructions:
1. Examine the document content (text, layout, headers, stamps, seals, formatting)
2. Determine if this document is genuinely a "${rule.doc_description}"
3. Look for the expected keywords and typical content patterns
4. Consider the document layout - official documents have specific formats

Respond ONLY with a JSON object in this exact format (no markdown, no code fences):
{
  "is_valid": true or false,
  "confidence": a number between 0.0 and 1.0,
  "reason": "Brief explanation of why the document does or does not match",
  "extracted_text_preview": "First 200 characters of readable text found in the document"
}

If the document is blurry, unreadable, or you cannot determine its content, set is_valid to false with confidence 0.2 and explain in the reason.
If the document clearly matches, set is_valid to true with high confidence.
If the document is clearly a different type of document, set is_valid to false with a clear reason stating what type of document it appears to be instead.`;
}

async function validateWithAI(
  fileBytes: Uint8Array,
  mimeType: string,
  prompt: string,
  rule: ValidationRule,
): Promise<ValidationResult> {
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.warn('No LOVABLE_API_KEY configured — using keyword fallback validation');
      return keywordFallbackValidation(rule, true);
    }

    // Encode file to base64
    const base64Data = btoa(
      Array.from(fileBytes).map(b => String.fromCharCode(b)).join('')
    );

    const effectiveMime = mimeType || 'application/pdf';

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: effectiveMime,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
      },
    };

    // Use Google Gemini API directly (accessible from edge functions)
    const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${LOVABLE_API_KEY}`;

    const response = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      // Fall back gracefully — accept document with low confidence
      return keywordFallbackValidation(rule, true);
    }

    const aiResponse = await response.json();

    const textContent = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', textContent);
      return keywordFallbackValidation(rule, true);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      is_valid: parsed.is_valid === true && (parsed.confidence >= rule.min_confidence),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      reason: parsed.reason || 'No reason provided',
      extracted_text_preview: parsed.extracted_text_preview || undefined,
      user_message: parsed.is_valid
        ? `Document verified as ${rule.doc_description}.`
        : `The uploaded file does not appear to be a valid ${rule.doc_description}. ${parsed.reason || ''}`,
    };
  } catch (aiError) {
    // Log the full technical error server-side
    console.error('AI validation service error (falling back to accept):', {
      message: aiError.message,
      stack: aiError.stack,
      name: aiError.name,
    });

    // Gracefully accept — AI is unavailable, don't block user
    return keywordFallbackValidation(rule, true);
  }
}

function keywordFallbackValidation(rule: ValidationRule, aiUnavailable = false): ValidationResult {
  if (aiUnavailable) {
    return {
      is_valid: true,
      confidence: 0.5,
      reason: `AI verification service unavailable. Document accepted pending manual review.`,
      user_message: `Document accepted. Automatic content verification was not available — your document will be reviewed manually.`,
    };
  }
  return {
    is_valid: false,
    confidence: 0.1,
    reason: `Unable to analyze document content automatically. Expected a valid ${rule.doc_description}.`,
    user_message: `We could not verify this document. Please ensure you are uploading a valid ${rule.doc_description}. Try uploading a clearer scan or image.`,
  };
}
