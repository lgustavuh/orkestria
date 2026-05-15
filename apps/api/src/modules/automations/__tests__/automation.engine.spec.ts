import { Test, TestingModule } from '@nestjs/testing';
import { AutomationEngine } from '../automation.engine';
import { AutomationsService } from '../automations.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('AutomationEngine', () => {
  let engine: AutomationEngine;
  let automationsService: any;
  let queue: any;

  const mockAutomationsService = {
    findByTrigger: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationEngine,
        { provide: AutomationsService, useValue: mockAutomationsService },
        { provide: getQueueToken('automations'), useValue: mockQueue },
      ],
    }).compile();

    engine = module.get<AutomationEngine>(AutomationEngine);
    jest.clearAllMocks();
  });

  describe('fire', () => {
    it('should find and execute matching automations', async () => {
      mockAutomationsService.findByTrigger.mockResolvedValue([
        {
          id: 'auto-1',
          name: 'Test Auto',
          conditions: null,
          actions: [
            { id: 'act-1', type: 'SEND_NOTIFICATION', config: { title: 'Hey' }, order: 0 },
          ],
        },
      ]);

      await engine.fire({ trigger: 'TASK_COMPLETED', projectId: 'p1', payload: { taskId: 't1' } });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'SEND_NOTIFICATION',
        expect.objectContaining({ automationId: 'auto-1', actionType: 'SEND_NOTIFICATION' }),
        expect.any(Object),
      );
    });

    it('should skip automations with unmet conditions', async () => {
      mockAutomationsService.findByTrigger.mockResolvedValue([
        {
          id: 'auto-1',
          name: 'Conditional',
          conditions: [{ field: 'priority', operator: 'eq', value: 'URGENT' }],
          actions: [{ id: 'act-1', type: 'SEND_NOTIFICATION', config: {}, order: 0 }],
        },
      ]);

      await engine.fire({ trigger: 'TASK_COMPLETED', payload: { priority: 'LOW' } });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should execute when conditions are met', async () => {
      mockAutomationsService.findByTrigger.mockResolvedValue([
        {
          id: 'auto-1',
          name: 'Conditional',
          conditions: [{ field: 'priority', operator: 'eq', value: 'URGENT' }],
          actions: [{ id: 'act-1', type: 'SEND_NOTIFICATION', config: {}, order: 0 }],
        },
      ]);

      await engine.fire({ trigger: 'TASK_COMPLETED', payload: { priority: 'URGENT' } });

      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should handle multiple conditions (AND logic)', async () => {
      mockAutomationsService.findByTrigger.mockResolvedValue([
        {
          id: 'auto-1',
          name: 'Multi Cond',
          conditions: [
            { field: 'priority', operator: 'eq', value: 'HIGH' },
            { field: 'status', operator: 'eq', value: 'DONE' },
          ],
          actions: [{ id: 'act-1', type: 'ADVANCE_STAGE', config: {}, order: 0 }],
        },
      ]);

      // Only one condition met
      await engine.fire({ trigger: 'TASK_COMPLETED', payload: { priority: 'HIGH', status: 'IN_PROGRESS' } });
      expect(mockQueue.add).not.toHaveBeenCalled();

      // Both conditions met
      await engine.fire({ trigger: 'TASK_COMPLETED', payload: { priority: 'HIGH', status: 'DONE' } });
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should enqueue multiple actions in order', async () => {
      mockAutomationsService.findByTrigger.mockResolvedValue([
        {
          id: 'auto-1',
          name: 'Multi Action',
          conditions: null,
          actions: [
            { id: 'act-1', type: 'CHANGE_STATUS', config: { newStatus: 'DONE' }, order: 0 },
            { id: 'act-2', type: 'SEND_NOTIFICATION', config: { title: 'Done!' }, order: 1 },
            { id: 'act-3', type: 'ADVANCE_STAGE', config: {}, order: 2 },
          ],
        },
      ]);

      await engine.fire({ trigger: 'APPROVAL_APPROVED', payload: {} });

      expect(mockQueue.add).toHaveBeenCalledTimes(3);
      expect(mockQueue.add.mock.calls[0][0]).toBe('CHANGE_STATUS');
      expect(mockQueue.add.mock.calls[1][0]).toBe('SEND_NOTIFICATION');
      expect(mockQueue.add.mock.calls[2][0]).toBe('ADVANCE_STAGE');
    });

    it('should support condition operators: gte, lt, in, contains', async () => {
      const makeAuto = (conds: any[]) => [{
        id: 'a1', name: 'T', conditions: conds,
        actions: [{ id: 'x', type: 'SEND_NOTIFICATION', config: {}, order: 0 }],
      }];

      // gte
      mockAutomationsService.findByTrigger.mockResolvedValue(makeAuto([{ field: 'score', operator: 'gte', value: 80 }]));
      await engine.fire({ trigger: 'TASK_COMPLETED', payload: { score: 90 } });
      expect(mockQueue.add).toHaveBeenCalled();

      jest.clearAllMocks();

      // lt
      mockAutomationsService.findByTrigger.mockResolvedValue(makeAuto([{ field: 'days', operator: 'lt', value: 3 }]));
      await engine.fire({ trigger: 'DEADLINE_APPROACHING', payload: { days: 5 } });
      expect(mockQueue.add).not.toHaveBeenCalled();

      jest.clearAllMocks();

      // in
      mockAutomationsService.findByTrigger.mockResolvedValue(makeAuto([{ field: 'status', operator: 'in', value: ['HIGH', 'URGENT'] }]));
      await engine.fire({ trigger: 'TASK_CREATED', payload: { status: 'URGENT' } });
      expect(mockQueue.add).toHaveBeenCalled();

      jest.clearAllMocks();

      // contains
      mockAutomationsService.findByTrigger.mockResolvedValue(makeAuto([{ field: 'title', operator: 'contains', value: 'urgente' }]));
      await engine.fire({ trigger: 'TASK_CREATED', payload: { title: 'Tarefa urgente para hoje' } });
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
