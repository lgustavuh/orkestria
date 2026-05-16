import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AutomationsService } from './automations.service';
import { AutomationTrigger } from '@prisma/client';

export interface AutomationEvent {
  trigger: AutomationTrigger;
  projectId?: string;
  payload: Record<string, any>;
}

@Injectable()
export class AutomationEngine {
  private readonly logger = new Logger(AutomationEngine.name);
  private readonly MAX_DEPTH = 5; // Previne loops de automação
  private currentDepth = 0;

  constructor(
    private automationsService: AutomationsService,
    @InjectQueue('automations') private automationsQueue: Queue,
  ) {}

  /**
   * Dispara um evento e encontra automações correspondentes.
   * Chamado por services quando algo relevante acontece.
   */
  async fire(event: AutomationEvent) {
    if (this.currentDepth >= this.MAX_DEPTH) {
      this.logger.warn(`Profundidade máxima de automação atingida (${this.MAX_DEPTH}). Abortando.`);
      return;
    }

    try {
      this.currentDepth++;

      const automations = await this.automationsService.findByTrigger(
        event.trigger,
        event.projectId,
      );

      for (const automation of automations) {
        // Avaliar condições
        if (automation.conditions && !this.evaluateConditions(automation.conditions, event.payload)) {
          this.logger.debug(`Automação "${automation.name}" — condições não atendidas`);
          continue;
        }

        // Enfileirar cada ação
        for (const action of automation.actions) {
          await this.automationsQueue.add(
            action.type,
            {
              automationId: automation.id,
              actionId: action.id,
              actionType: action.type,
              config: action.config,
              eventPayload: event.payload,
              projectId: event.projectId,
              depth: this.currentDepth,
            },
            {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: 100,
              removeOnFail: 200,
            },
          );

          this.logger.log(`Ação "${action.type}" enfileirada para automação "${automation.name}"`);
        }
      }
    } finally {
      this.currentDepth--;
    }
  }

  /**
   * Avalia condições no formato:
   * [
   *   { field: "status", operator: "eq", value: "COMPLETED" },
   *   { field: "priority", operator: "gte", value: "HIGH" }
   * ]
   *
   * Todas as condições devem ser verdadeiras (AND).
   */
  private evaluateConditions(conditions: any, payload: Record<string, any>): boolean {
    if (!Array.isArray(conditions)) return true;

    return conditions.every((cond: any) => {
      const fieldValue = payload[cond.field];
      const targetValue = cond.value;

      switch (cond.operator) {
        case 'eq':
          return fieldValue === targetValue;
        case 'neq':
          return fieldValue !== targetValue;
        case 'gt':
          return fieldValue > targetValue;
        case 'gte':
          return fieldValue >= targetValue;
        case 'lt':
          return fieldValue < targetValue;
        case 'lte':
          return fieldValue <= targetValue;
        case 'in':
          return Array.isArray(targetValue) && targetValue.includes(fieldValue);
        case 'contains':
          return typeof fieldValue === 'string' && fieldValue.includes(targetValue);
        default:
          this.logger.warn(`Operador desconhecido: ${cond.operator}`);
          return false;
      }
    });
  }
}
