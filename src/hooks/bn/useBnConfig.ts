import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as configService from '@/services/bn/configService';
import * as channelService from '@/services/bn/productChannelConfigService';

// Countries
export const useBnCountries = () => useQuery({ queryKey: ['bn', 'countries'], queryFn: configService.fetchCountries });

// Schemes
export const useBnSchemes = (countryCode?: string) => useQuery({ queryKey: ['bn', 'schemes', countryCode], queryFn: () => configService.fetchSchemes(countryCode) });

// Branches
export const useBnBranches = (schemeId?: string) => useQuery({
  queryKey: ['bn', 'branches', schemeId],
  queryFn: () => configService.fetchBranches(schemeId),
});

// Rule Groups
export const useBnRuleGroups = (countryCode?: string) => useQuery({ queryKey: ['bn', 'rule-groups', countryCode], queryFn: () => configService.fetchRuleGroups(countryCode) });
export const useUpsertBnRuleGroup = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.upsertRuleGroup, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'rule-groups'] }) });
};

// Formula Templates
export const useBnFormulaTemplates = (countryCode?: string) => useQuery({ queryKey: ['bn', 'formula-templates', countryCode], queryFn: () => configService.fetchFormulaTemplates(countryCode) });
export const useUpsertBnFormulaTemplate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.upsertFormulaTemplate, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'formula-templates'] }) });
};

// Document Profiles
export const useBnDocumentProfiles = () => useQuery({ queryKey: ['bn', 'document-profiles'], queryFn: configService.fetchDocumentProfiles });
export const useUpsertBnDocumentProfile = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.upsertDocumentProfile, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'document-profiles'] }) });
};

// Document Rules (by product, optionally scoped to a version)
export const useBnDocumentRules = (productId: string | undefined, versionId?: string | undefined) => useQuery({
  queryKey: ['bn', 'document-rules', productId, versionId ?? null],
  queryFn: () => configService.fetchDocumentRulesByProduct(productId!, versionId),
  enabled: !!productId,
});
export const useUpsertBnDocumentRule = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.upsertDocumentRule, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'document-rules'] }) });
};
export const useDeleteBnDocumentRule = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.deleteDocumentRule, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'document-rules'] }) });
};

// Workflow Templates
export const useBnWorkflowTemplates = () => useQuery({ queryKey: ['bn', 'workflow-templates'], queryFn: configService.fetchWorkflowTemplates });
export const useUpsertBnWorkflowTemplate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.upsertWorkflowTemplate, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'workflow-templates'] }) });
};

// Screen Templates
export const useBnScreenTemplates = () => useQuery({ queryKey: ['bn', 'screen-templates'], queryFn: configService.fetchScreenTemplates });
export const useUpsertBnScreenTemplate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.upsertScreenTemplate, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'screen-templates'] }) });
};
export const useDeleteBnScreenTemplate = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.deleteScreenTemplate, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'screen-templates'] }) });
};

// Field Metadata
export const useBnFieldMetadata = (templateId: string | undefined) => useQuery({
  queryKey: ['bn', 'field-metadata', templateId],
  queryFn: () => configService.fetchFieldMetadata(templateId!),
  enabled: !!templateId,
});
export const useUpsertBnFieldMetadata = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: configService.upsertFieldMetadata,
    onSuccess: (_d, vars: any) => qc.invalidateQueries({ queryKey: ['bn', 'field-metadata', vars?.screen_template_id] }),
  });
};
export const useDeleteBnFieldMetadata = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; templateId?: string }) => configService.deleteFieldMetadata(id),
    onSuccess: (_d, vars: any) => qc.invalidateQueries({ queryKey: ['bn', 'field-metadata', vars?.templateId] }),
  });
};

// Interaction Rules
export const useBnInteractionRules = () => useQuery({ queryKey: ['bn', 'interaction-rules'], queryFn: configService.fetchInteractionRules });
export const useUpsertBnInteractionRule = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.upsertInteractionRule, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'interaction-rules'] }) });
};
export const useDeleteBnInteractionRule = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.deleteInteractionRule, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'interaction-rules'] }) });
};

// Override Policies
export const useBnOverridePolicies = () => useQuery({ queryKey: ['bn', 'override-policies'], queryFn: configService.fetchOverridePolicies });
export const useUpsertBnOverridePolicy = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.upsertOverridePolicy, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'override-policies'] }) });
};

// Version Approvals
export const useBnVersionApprovals = (versionId: string | undefined) => useQuery({
  queryKey: ['bn', 'version-approvals', versionId],
  queryFn: () => configService.fetchVersionApprovals(versionId!),
  enabled: !!versionId,
});
export const useCreateBnVersionApproval = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: configService.createVersionApproval, onSuccess: () => qc.invalidateQueries({ queryKey: ['bn'] }) });
};

// Channel Configurations (online/offline per product version)
export const useBnChannelConfigs = (productVersionId: string | undefined) => useQuery({
  queryKey: ['bn', 'channel-configs', productVersionId],
  queryFn: () => channelService.fetchChannelConfigs(productVersionId!),
  enabled: !!productVersionId,
});

export const useUpsertBnChannelConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: channelService.upsertChannelConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'channel-configs'] }),
  });
};

export const useEnsureBnChannelConfigs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, productVersionId }: { productId: string; productVersionId: string }) =>
      channelService.ensureChannelConfigs(productId, productVersionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bn', 'channel-configs'] }),
  });
};
