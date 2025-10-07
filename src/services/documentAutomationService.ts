import { supabase } from '@/integrations/supabase/client';
import { legalTemplates, mergeTemplate } from '@/data/legalTemplates';

export interface AutomationTrigger {
  eventType: 'case_created' | 'status_change' | 'debt_overdue' | 'hearing_scheduled' | 'judgment_entered';
  caseType?: string;
  status?: string;
  daysOverdue?: number;
  templateId: string;
  autoGenerate: boolean;
}

export const documentAutomationService = {
  // Check and trigger document generation based on case events
  async checkTriggers(caseId: string, eventType: AutomationTrigger['eventType'], caseData: any) {
    try {
      // Get case details
      const { data: caseInfo, error: caseError } = await supabase
        .from('legal_cases')
        .select('*')
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      // Define automation rules
      const rules: AutomationTrigger[] = [
        {
          eventType: 'case_created',
          caseType: 'Contribution Recovery',
          templateId: 'tmpl-1', // Legal Action Requisition
          autoGenerate: true,
        },
        {
          eventType: 'status_change',
          status: 'Filed',
          templateId: 'tmpl-2', // Summons to Appear
          autoGenerate: true,
        },
        {
          eventType: 'status_change',
          status: 'Judgment Entered',
          templateId: 'tmpl-3', // Judgment Summons
          autoGenerate: false, // Manual review required
        },
        {
          eventType: 'debt_overdue',
          daysOverdue: 30,
          templateId: 'tmpl-7', // Notice of Hearing
          autoGenerate: true,
        },
      ];

      // Find matching rules
      const matchingRules = rules.filter(rule => {
        if (rule.eventType !== eventType) return false;
        if (rule.caseType && rule.caseType !== caseInfo.case_type) return false;
        if (rule.status && rule.status !== caseInfo.status) return false;
        return true;
      });

      // Generate documents for matching rules
      for (const rule of matchingRules) {
        if (rule.autoGenerate) {
          await this.generateDocument(caseId, rule.templateId, caseData);
        }
      }

      return matchingRules.length;
    } catch (error) {
      console.error('Error checking automation triggers:', error);
      throw error;
    }
  },

  // Generate document from template
  async generateDocument(caseId: string, templateId: string, mergeData: any) {
    try {
      // Find template
      const template = legalTemplates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Merge template with data
      const content = mergeTemplate(template, mergeData);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('legal_documents')
        .insert([{
          case_id: caseId,
          name: `${template.name} - ${new Date().toISOString().split('T')[0]}`,
          type: template.category as any,
          uploaded_by: user.id,
          template_id: templateId,
          // Store generated content in a way that can be retrieved
          tags: ['auto-generated', template.type],
        }])
        .select()
        .single();

      if (docError) throw docError;

      // Create timeline event
      await supabase
        .from('legal_timeline_events')
        .insert({
          case_id: caseId,
          type: 'Document',
          actor_id: user.id,
          actor_name: 'System (Auto-generated)',
          description: `Auto-generated: ${template.name}`,
        });

      return { document, content };
    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  },

  // Create debt overdue alerts
  async createDebtAlerts(caseId: string) {
    try {
      // Get overdue debts
      const { data: debts, error } = await supabase
        .from('legal_penalties')
        .select('*')
        .eq('case_id', caseId)
        .lt('due_on', new Date().toISOString())
        .neq('status', 'Paid');

      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create tasks for overdue debts
      for (const debt of debts || []) {
        const daysOverdue = Math.floor(
          (new Date().getTime() - new Date(debt.due_on).getTime()) / (1000 * 60 * 60 * 24)
        );

        const priority = daysOverdue > 60 ? 'Urgent' : daysOverdue > 30 ? 'High' : 'Medium';
        
        await supabase
          .from('legal_tasks')
          .insert([{
            case_id: caseId,
            title: `Follow up on overdue payment - ${debt.type}`,
            description: `Payment of $${debt.amount} is ${daysOverdue} days overdue. Due date was ${new Date(debt.due_on).toLocaleDateString()}.`,
            priority: priority as any,
            status: 'Open',
            due_on: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            created_by: user.id,
          }]);
      }

      return debts?.length || 0;
    } catch (error) {
      console.error('Error creating debt alerts:', error);
      throw error;
    }
  },

  // Generate enforcement documents
  async generateEnforcementDocuments(caseId: string, enforcementType: 'writ' | 'commitment' | 'warrant') {
    const templateMap = {
      writ: 'tmpl-5', // Writ of Execution
      commitment: 'tmpl-4', // Warrant of Commitment
      warrant: 'tmpl-4', // Warrant of Commitment
    };

    const templateId = templateMap[enforcementType];
    
    // Get case data for merge
    const { data: caseData } = await supabase
      .from('legal_cases')
      .select(`
        *,
        legal_parties (*)
      `)
      .eq('id', caseId)
      .single();

    if (!caseData) throw new Error('Case not found');

    return this.generateDocument(caseId, templateId, caseData);
  },
};
