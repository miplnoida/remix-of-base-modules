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
      return new Response(JSON.stringify({ error: 'doc_code is required' }), {
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
        return new Response(JSON.stringify({
          is_valid: false,
          confidence: 0,
          reason: `Could not retrieve file for validation: ${downloadError?.message || 'File not found'}`,
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
        reason: 'No file provided for validation. Either upload a file or provide a file_path.',
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

    // Call Gemini via Lovable AI proxy for content analysis
    let result: ValidationResult;

    if (isImage || isPdf) {
      result = await validateWithAI(fileBytes, mimeType, aiPrompt, validationRule);
    } else if (isDoc) {
      // For Word docs, we can't directly send to vision AI — use keyword fallback
      result = {
        is_valid: false,
        confidence: 0.3,
        reason: `Word document format detected. Content analysis is limited for this format. Please upload a PDF or image version of your ${validationRule.doc_description} for full validation.`,
      };
    } else {
      result = {
        is_valid: false,
        confidence: 0,
        reason: `Unsupported file format (${mimeType}). Please upload a PDF or image file for document validation.`,
      };
    }

    // Store validation result
    if (documentId) {
      await supabase.from('document_validation_results').insert({
        document_id: documentId,
        doc_code: docCode,
        is_valid: result.is_valid,
        confidence: result.confidence,
        reason: result.reason,
        extracted_text_preview: result.extracted_text_preview || null,
        validated_by: userId || null,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(JSON.stringify({
      is_valid: false,
      confidence: 0,
      reason: `Validation service error: ${error.message}`,
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
  // Use Gemini 2.5 Flash for fast multimodal analysis
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  // Encode file to base64
  const base64Data = btoa(
    Array.from(fileBytes).map(b => String.fromCharCode(b)).join('')
  );

  // For PDFs, use application/pdf mime type directly with Gemini
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

  // Use Lovable AI proxy endpoint
  const aiUrl = `https://lovable-ai-proxy.lovable.dev/v1/gemini/v1beta/models/gemini-2.5-flash:generateContent`;

  const response = await fetch(aiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEMINI_API_KEY || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', response.status, errorText);
    
    // Fallback to keyword-based validation
    return keywordFallbackValidation(rule);
  }

  const aiResponse = await response.json();
  
  try {
    const textContent = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', textContent);
      return keywordFallbackValidation(rule);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      is_valid: parsed.is_valid === true && (parsed.confidence >= rule.min_confidence),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      reason: parsed.reason || 'No reason provided',
      extracted_text_preview: parsed.extracted_text_preview || undefined,
    };
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    return keywordFallbackValidation(rule);
  }
}

function keywordFallbackValidation(rule: ValidationRule): ValidationResult {
  return {
    is_valid: false,
    confidence: 0.1,
    reason: `Unable to analyze document content automatically. Please ensure you are uploading a valid ${rule.doc_description}. If the file is correct, try uploading a clearer scan or image.`,
  };
}
