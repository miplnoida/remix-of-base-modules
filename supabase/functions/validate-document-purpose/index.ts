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
      console.error('LOVABLE_API_KEY is missing for document-purpose validation', {
        doc_code: rule.doc_code,
        mime_type: mimeType,
        file_size_bytes: fileBytes.length,
      });
      return {
        is_valid: false,
        confidence: 0,
        reason: 'AI validation credential is not configured.',
        user_message: 'Document verification is currently unavailable. Please try again later.',
        _fallback: false,
      };
    }

    const base64Data = btoa(Array.from(fileBytes, (b) => String.fromCharCode(b)).join(''));
    const effectiveMime = mimeType || 'application/octet-stream';
    const dataUrl = `data:${effectiveMime};base64,${base64Data}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a strict document verification system. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway validation error', {
        status: aiResponse.status,
        error: errorText,
        doc_code: rule.doc_code,
        mime_type: mimeType,
        file_size_bytes: fileBytes.length,
      });

      if (isTemporaryAiFailure(aiResponse.status, errorText)) {
        return keywordFallbackValidation(rule, true);
      }

      return {
        is_valid: false,
        confidence: 0,
        reason: `AI validation request failed with status ${aiResponse.status}.`,
        user_message: 'We could not verify this document automatically right now. Please try again.',
        _fallback: false,
      };
    }

    const payload = await aiResponse.json();
    const content = payload.choices?.[0]?.message?.content;
    const textContent = extractTextContent(content);

    if (!textContent) {
      console.error('AI response missing content for validation', {
        doc_code: rule.doc_code,
        mime_type: mimeType,
        response: payload,
      });
      return {
        is_valid: false,
        confidence: 0,
        reason: 'AI response did not include analyzable content.',
        user_message: 'We could not verify this file content. Please upload a clearer document and try again.',
        _fallback: false,
      };
    }

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI response JSON parse target not found', {
        doc_code: rule.doc_code,
        mime_type: mimeType,
        content_preview: textContent.slice(0, 500),
      });
      return {
        is_valid: false,
        confidence: 0,
        reason: 'AI response format was invalid.',
        user_message: 'Document verification could not be completed. Please try uploading a clearer file.',
        _fallback: false,
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      const parseErr = parseError instanceof Error ? parseError : new Error(String(parseError));
      console.error('AI response JSON parse failed', {
        message: parseErr.message,
        stack: parseErr.stack,
        doc_code: rule.doc_code,
        mime_type: mimeType,
      });
      return {
        is_valid: false,
        confidence: 0,
        reason: `Failed to parse AI verification response: ${parseErr.message}`,
        user_message: 'Document verification could not be completed. Please try again.',
        _fallback: false,
      };
    }

    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));
    const matchesPurpose = parsed.is_valid === true && confidence >= rule.min_confidence;
    const parsedReason = typeof parsed.reason === 'string'
      ? parsed.reason
      : matchesPurpose
        ? `Document matches ${rule.doc_description}.`
        : `Document does not appear to match ${rule.doc_description}.`;

    return {
      is_valid: matchesPurpose,
      confidence,
      reason: parsedReason,
      extracted_text_preview: typeof parsed.extracted_text_preview === 'string'
        ? parsed.extracted_text_preview
        : undefined,
      user_message: matchesPurpose
        ? `Document verified as ${rule.doc_description}.`
        : `The uploaded file does not appear to match ${rule.doc_description}. ${parsedReason}`,
      _fallback: false,
    };
  } catch (aiError) {
    const err = aiError instanceof Error ? aiError : new Error(String(aiError));

    console.error('AI validation runtime exception', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      doc_code: rule.doc_code,
      mime_type: mimeType,
      file_size_bytes: fileBytes.length,
    });

    if (isTransientRuntimeFailure(err.message)) {
      return keywordFallbackValidation(rule, true);
    }

    return {
      is_valid: false,
      confidence: 0,
      reason: `AI validation runtime error: ${err.message}`,
      user_message: 'Document verification failed due to a technical issue. Please try again.',
      _fallback: false,
    };
  }
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

function isTemporaryAiFailure(status: number, errorText: string): boolean {
  if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  return /temporar|timeout|unavailable|overloaded|rate.?limit|gateway/i.test(errorText);
}

function isTransientRuntimeFailure(message: string): boolean {
  return /fetch failed|network|timeout|timed out|connection|econn|enotfound|dns|tls/i.test(message);
}

function keywordFallbackValidation(rule: ValidationRule, aiUnavailable = false): ValidationResult {
  if (aiUnavailable) {
    return {
      is_valid: true,
      confidence: 0.5,
      reason: 'AI verification service unavailable. Document accepted pending manual review.',
      user_message: 'Document accepted. Automatic content verification was not available — your document will be reviewed manually.',
      _fallback: true,
    };
  }

  return {
    is_valid: false,
    confidence: 0.1,
    reason: `Unable to analyze document content automatically. Expected a valid ${rule.doc_description}.`,
    user_message: `We could not verify this document. Please ensure you are uploading a valid ${rule.doc_description}. Try uploading a clearer scan or image.`,
    _fallback: false,
  };
}
