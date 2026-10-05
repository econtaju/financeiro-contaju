import { storage } from './storageService';

export interface ImportAuditLog {
  id: string; // ID único do lote de importação
  importedAt: string; // ISO 8601
  fileName: string;
  presetName: string;
  user: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  settledCount: number;
  totalAmountReceivables: number;
  totalAmountPayables: number;
  createdTitleIds: string[];
  updatedTitleIds: string[];
  createdPartyIds?: string[];
  rolledBack?: boolean;
  rolledBackAt?: string;
}

const IMPORT_AUDIT_STORAGE_KEY = 'contaju_import_audit_logs';

export const importAuditService = {
  getLogs(): ImportAuditLog[] {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(IMPORT_AUDIT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Erro ao ler logs de auditoria de importação:', e);
      return [];
    }
  },

  saveLog(log: ImportAuditLog): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const current = this.getLogs();
      const updated = [log, ...current.filter(l => l.id !== log.id)].slice(0, 50); // manter histórico dos 50 lotes mais recentes
      localStorage.setItem(IMPORT_AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar log de auditoria de importação:', e);
    }
  },

  deleteLog(id: string): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const current = this.getLogs();
      const updated = current.filter(l => l.id !== id);
      localStorage.setItem(IMPORT_AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao excluir log de auditoria:', e);
    }
  },

  rollbackBatch(batchId: string): { 
    success: boolean; 
    rolledBackTitles: number; 
    rolledBackSettlements: number; 
    rolledBackMovements: number; 
    message: string 
  } {
    const logs = this.getLogs();
    const logIndex = logs.findIndex(l => l.id === batchId);
    if (logIndex === -1) {
      return { 
        success: false, 
        rolledBackTitles: 0, 
        rolledBackSettlements: 0, 
        rolledBackMovements: 0, 
        message: 'Lote de importação não encontrado no histórico.' 
      };
    }

    const log = logs[logIndex];
    if (log.rolledBack) {
      return { 
        success: false, 
        rolledBackTitles: 0, 
        rolledBackSettlements: 0, 
        rolledBackMovements: 0, 
        message: 'Este lote já foi revertido anteriormente.' 
      };
    }

    const createdIdsSet = new Set(log.createdTitleIds || []);
    if (createdIdsSet.size === 0) {
      log.rolledBack = true;
      log.rolledBackAt = new Date().toISOString();
      this.saveLog(log);
      return { 
        success: true, 
        rolledBackTitles: 0, 
        rolledBackSettlements: 0, 
        rolledBackMovements: 0, 
        message: 'Lote continha apenas atualizações ou zero títulos criados.' 
      };
    }

    const currentTitles = storage.getTitles();
    const currentSettlements = storage.getSettlements();
    const currentMovements = storage.getMovements();

    // 1. Identificar liquidações/baixas vinculadas aos títulos criados
    const settlementsToRemove = currentSettlements.filter(s => createdIdsSet.has(s.titleId));
    const settlementIdsToRemove = new Set(settlementsToRemove.map(s => s.id));

    // 2. Identificar movimentos bancários correspondentes
    const movementsToRemove = currentMovements.filter(m => 
      m.originReferenceId && settlementIdsToRemove.has(m.originReferenceId)
    );

    // 3. Remover títulos criados, baixas e movimentações geradas
    const updatedTitles = currentTitles.filter(t => !createdIdsSet.has(t.id));
    const updatedSettlements = currentSettlements.filter(s => !settlementIdsToRemove.has(s.id));
    const updatedMovements = currentMovements.filter(m => !movementsToRemove.some(rm => rm.id === m.id));

    // 4. Salvar estado limpo no storage
    storage.saveTitles(updatedTitles);
    storage.saveSettlements(updatedSettlements);
    storage.saveMovements(updatedMovements);

    // 5. Marcar log como revertido
    log.rolledBack = true;
    log.rolledBackAt = new Date().toISOString();
    logs[logIndex] = log;
    try {
      localStorage.setItem(IMPORT_AUDIT_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn('Erro ao atualizar log após rollback:', e);
    }

    return {
      success: true,
      rolledBackTitles: createdIdsSet.size,
      rolledBackSettlements: settlementsToRemove.length,
      rolledBackMovements: movementsToRemove.length,
      message: `Reversão concluída com sucesso! ${createdIdsSet.size} títulos criados foram removidos do sistema.`
    };
  }
};
