import { supabase } from "@/integrations/supabase/client";
import { coreTemplateDispatcherService, DispatchInput } from "./coreTemplateDispatcherService";

/**
 * Two-step send: generate the document via dispatcher, then call the edge
 * function that actually delivers it (email queue, SMS, in-app, etc.).
 *
 * Use this from feature code (Legal cases, Benefit awards, Compliance notices).
 */
export const coreTemplateSendService = {
  async sendDocument(input: DispatchInput) {
    const generated = await coreTemplateDispatcherService.dispatch(input);

    const { data, error } = await supabase.functions.invoke("dispatch-core-document", {
      body: {
        generated_document_id: generated.id,
        recipient_address: input.recipient_address,
      },
    });
    if (error) throw error;

    return { generated, dispatch: data };
  },
};
