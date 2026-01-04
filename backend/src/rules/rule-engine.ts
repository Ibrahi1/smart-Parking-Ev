// backend/src/rules/rule-engine.ts

import { ThreatRule, RuleCondition } from '../models/ThreatRule';
import { SecurityEvent } from '../models/SecurityEvent';

export class RuleEngine {
  evaluate(rule: ThreatRule, event: SecurityEvent): boolean {
    // Check all conditions
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, event)) {
        return false;
      }
    }
    return true;
  }

  private evaluateCondition(condition: RuleCondition, event: any): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);

    switch (condition.operator) {
      case 'equals':
        return this.compareEquals(fieldValue, condition.value, condition.caseInsensitive);

      case 'not_equals':
        return !this.compareEquals(fieldValue, condition.value, condition.caseInsensitive);

      case 'contains':
        return this.compareContains(fieldValue, condition.value, condition.caseInsensitive);

      case 'not_contains':
        return !this.compareContains(fieldValue, condition.value, condition.caseInsensitive);

      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;

      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);

      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);

      case 'matches':
        return this.compareRegex(fieldValue, condition.value);

      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;

      default:
        console.warn(`Unknown operator: ${condition.operator}`);
        return false;
    }
  }

  private getFieldValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private compareEquals(value1: any, value2: any, caseInsensitive?: boolean): boolean {
    if (caseInsensitive && typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }
    return value1 === value2;
  }

  private compareContains(value: any, searchValue: any, caseInsensitive?: boolean): boolean {
    if (typeof value === 'string' && typeof searchValue === 'string') {
      const str = caseInsensitive ? value.toLowerCase() : value;
      const search = caseInsensitive ? searchValue.toLowerCase() : searchValue;
      return str.includes(search);
    }

    if (Array.isArray(value)) {
      return value.some(item => this.compareEquals(item, searchValue, caseInsensitive));
    }

    return false;
  }

  private compareRegex(value: any, pattern: string): boolean {
    if (typeof value !== 'string') return false;
    
    try {
      const regex = new RegExp(pattern);
      return regex.test(value);
    } catch (error) {
      console.error('Invalid regex pattern:', pattern);
      return false;
    }
  }
}
