import { useQuery } from '@tanstack/react-query';
import {
  listServices,
  listContracts,
  listConsumers,
  listChecklist,
  listAssessments,
  checkAdminAccessHealth,
} from './service';

const K = ['core-platform-services'];

export const usePlatformServices = () => useQuery({ queryKey: [...K, 'services'], queryFn: listServices });
export const usePlatformServiceContracts = () => useQuery({ queryKey: [...K, 'contracts'], queryFn: listContracts });
export const usePlatformServiceConsumers = () => useQuery({ queryKey: [...K, 'consumers'], queryFn: listConsumers });
export const usePlatformChecklist = () => useQuery({ queryKey: [...K, 'checklist'], queryFn: listChecklist });
export const usePlatformAssessments = () => useQuery({ queryKey: [...K, 'assessments'], queryFn: listAssessments });
export const usePlatformAdminAccessHealth = () =>
  useQuery({ queryKey: [...K, 'health-access'], queryFn: checkAdminAccessHealth });
