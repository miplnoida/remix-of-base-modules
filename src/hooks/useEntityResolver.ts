/**
 * React hook for entity type resolution.
 * Wraps the entityResolver service for use in components.
 */

import { useState, useCallback } from 'react';
import {
  resolveEntityType,
  validateEntity,
  isEmployer,
  isInsuredPerson,
  isSelfEmployed,
  isVoluntaryContributor,
  type EntityType,
  type ResolvedEntity,
  type EntityValidationResult,
} from '@/services/entityResolver';

export function useEntityResolver() {
  const [isResolving, setIsResolving] = useState(false);

  const resolve = useCallback(async (identifier: string): Promise<ResolvedEntity[]> => {
    setIsResolving(true);
    try {
      return await resolveEntityType(identifier);
    } finally {
      setIsResolving(false);
    }
  }, []);

  const validate = useCallback(async (
    identifier: string,
    expectedType: EntityType
  ): Promise<EntityValidationResult> => {
    setIsResolving(true);
    try {
      return await validateEntity(identifier, expectedType);
    } finally {
      setIsResolving(false);
    }
  }, []);

  return {
    resolve,
    validate,
    isEmployer,
    isInsuredPerson,
    isSelfEmployed,
    isVoluntaryContributor,
    isResolving,
  };
}
