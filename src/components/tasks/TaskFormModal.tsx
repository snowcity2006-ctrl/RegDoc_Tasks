import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  X,
  Check,
  AlertCircle,
  Calendar,
  User,
  FileText,
  Clock,
  Maximize2,
  Minimize2,
  CheckCircle2
} from 'lucide-react';
import { TaskRecord, Employee } from '../../types';
import { calculateDaysRemaining, getTaskStatusInfo } from '../../utils/taskUtils';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<TaskRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }) => Promise<void>;
  employees: Employee[];
  initialData?: TaskRecord | null;
  onOpenNewEmployeeModal?: () => void;
  tasks?: TaskRecord[];
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employees,
  initialData,
  onOpenNewEmployeeModal,
  tasks = [],
}) => {
  const [taskText, setTaskText] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [actualEndDate, setActualEndDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [assigneeId, setAssigneeId] = useState<number | ''>('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Расчет загрузки исполнителей в % от задач на исполнении (задача считается выполненной только при наличии отметки "Принято")
  const workloadMap = React.useMemo(() => {
    const inExecution = tasks.filter((t) => !t.isAccepted);
    const total = inExecution.length;
    const map: Record<number, { count: number; percentageStr: string }> = {};

    employees.forEach((emp) => {
      const count = inExecution.filter((t) => t.assigneeId === emp.id).length;
      const pct = total > 0 ? (count / total) * 100 : 0;
      map[emp.id] = { count, percentageStr: `${pct.toFixed(2)}%` };
    });

    return { total, map };
  }, [tasks, employees]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTaskText(initialData.task || '');
      setPlannedEndDate(initialData.plannedEndDate || '');
      setActualEndDate(initialData.actualEndDate || '');
      setIsCompleted(Boolean(initialData.isCompleted));
      setIsAccepted(Boolean(initialData.isAccepted));
      setAssigneeId(initialData.assigneeId ?? '');
      setResult(initialData.result || '');
    } else {
      setTaskText('');
      // По умолчанию плановая дата - через 7 дней
      const defDate = new Date();
      defDate.setDate(defDate.getDate() + 7);
      setPlannedEndDate(defDate.toISOString().slice(0, 10));
      setActualEndDate('');
      setIsCompleted(false);
      setIsAccepted(false);
      setAssigneeId(employees.length > 0 ? employees[0].id : '');
      setResult('');
    }
    setError(null);
  }, [initialData, isOpen, employees]);

  if (!isOpen) return null;

  // Расчет оставшихся дней для интерактивного предпросмотра
  const previewDays = calculateDaysRemaining(
    plannedEndDate,
    isAccepted,
    initialData?.isAccepted ? initialData.frozenDaysRemaining : null,
    actualEndDate
  );
  const statusInfo = getTaskStatusInfo(previewDays, isAccepted, isCompleted);

  const handleToggleCompleted = (checked: boolean) => {
    setIsCompleted(checked);
    if (!checked && isAccepted) {
      setIsAccepted(false);
    }
  };

  const handleToggleAccepted = (checked: boolean) => {
    if (!isCompleted) return;
    setIsAccepted(checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim()) {
      setError('Укажите формулировку задачи');
      return;
    }
    if (!plannedEndDate) {
      setError('Укажите плановую дату окончания');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const selectedEmp = employees.find((e) => e.id === Number(assigneeId));
      const assigneeName = selectedEmp ? selectedEmp.fullName : '';

      // Если задача принята, пересчитываем значение как разницу между "План" - "Факт" (при наличии факта)
      let frozenDays: number | null = null;
      if (isAccepted && actualEndDate) {
        frozenDays = calculateDaysRemaining(plannedEndDate, true, null, actualEndDate);
      }

      await onSave({
        ...(initialData ? { id: initialData.id } : {}),
        task: taskText.trim(),
        plannedEndDate,
        actualEndDate: actualEndDate || '',
        isCompleted,
        isAccepted,
        frozenDaysRemaining: frozenDays,
        assigneeId: assigneeId ? Number(assigneeId) : null,
        assigneeName,
        result: result.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения задачи');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-[#171A21] border border-[#2D3139] shadow-2xl rounded-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isMaximized ? 'w-full h-full max-w-none rounded-none' : 'w-full max-w-2xl max-h-[92vh]'
        }`}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2D3139] bg-[#1C202A]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#E0E0E0]">
                {initialData ? 'Редактирование задачи' : 'Создание новой задачи'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Контроль исполнения поручений и отслеживание сроков
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2D3139] transition-colors"
              title={isMaximized ? 'Свернуть' : 'Развернуть'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2D3139] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Тело формы */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Индикатор статуса и расчетных дней */}
          <div className="p-3.5 bg-[#0F1115] border border-[#2D3139] rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-gray-400">Текущий статус:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusInfo.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                {statusInfo.statusText}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">Осталось дней:</span>
              <span className={`font-mono font-bold text-sm ${statusInfo.textClass}`}>
                {previewDays === null ? '—' : previewDays > 0 ? `+${previewDays}` : previewDays}
              </span>
              {isAccepted && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                  зафиксировано
                </span>
              )}
            </div>
          </div>

          {/* Формулировка задачи */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Задача (описание поручения) *</span>
            </label>
            <textarea
              id="input-task-text"
              required
              rows={3}
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
              placeholder="Введите содержание поручения или задачи..."
              className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
            />
          </div>

          {/* Сроки: Плановая и Фактическая дата */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Дата окончания по плану *</span>
              </label>
              <input
                id="input-task-planned-date"
                type="date"
                required
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Дата окончания по факту</span>
              </label>
              <input
                id="input-task-actual-date"
                type="date"
                value={actualEndDate}
                onChange={(e) => setActualEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Ответственный */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Ответственный</span>
              </label>
              {onOpenNewEmployeeModal && (
                <button
                  type="button"
                  onClick={onOpenNewEmployeeModal}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                  + Новый сотрудник
                </button>
              )}
            </div>
            <select
              id="select-task-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="">Не назначен</option>
              {employees.map((emp) => {
                const wl = workloadMap.map[emp.id];
                const loadStr = wl ? ` [Загрузка: ${wl.percentageStr}]` : '';
                return (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}{loadStr}{emp.position ? ` (${emp.position})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Чекбоксы: Выполнено и Принято */}
          <div className="p-4 bg-[#0F1115] border border-[#2D3139] rounded-xl space-y-3">
            <span className="text-xs font-semibold text-gray-300 block">Отметки исполнения:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                htmlFor="checkbox-modal-task-completed"
                className="flex items-start gap-3 p-2.5 rounded-lg bg-[#171A21] border border-[#2D3139] cursor-pointer hover:border-gray-500 transition-colors"
              >
                <input
                  id="checkbox-modal-task-completed"
                  type="checkbox"
                  checked={isCompleted}
                  onChange={(e) => handleToggleCompleted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-[#0F1115]"
                />
                <div>
                  <span className="text-xs font-medium text-[#E0E0E0] block">Выполнено</span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Исполнитель завершил выполнение работы
                  </span>
                </div>
              </label>

              <label
                htmlFor="checkbox-modal-task-accepted"
                className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                  !isCompleted
                    ? 'bg-[#171A21]/50 border-[#2D3139]/50 opacity-40 cursor-not-allowed'
                    : 'bg-[#171A21] border-[#2D3139] cursor-pointer hover:border-gray-500'
                }`}
                title={!isCompleted ? 'Недоступно: сначала необходимо установить отметку "Выполнено"' : undefined}
              >
                <input
                  id="checkbox-modal-task-accepted"
                  type="checkbox"
                  disabled={!isCompleted}
                  checked={isAccepted}
                  onChange={(e) => handleToggleAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 text-emerald-600 focus:ring-emerald-500 bg-[#0F1115] disabled:cursor-not-allowed"
                />
                <div>
                  <span className="text-xs font-medium text-[#E0E0E0] block">Принято</span>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {!isCompleted
                      ? 'Сначала необходимо установить отметку "Выполнено"'
                      : 'Руководитель принял результат (счетчик дней фиксируется)'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Поле "Результат" */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Результат выполнения</span>
            </label>
            <textarea
              id="input-task-result"
              rows={3}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Укажите достигнутый результат, реквизиты подтверждающего документа или комментарий..."
              className="w-full px-3.5 py-2.5 bg-[#0F1115] border border-[#2D3139] rounded-xl text-xs text-[#E0E0E0] placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-y"
            />
          </div>

          {/* Кнопки действий */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#2D3139]">
            <button
              id="btn-cancel-task-form"
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-[#2D3139] transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              id="btn-save-task-form"
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{initialData ? 'Сохранить изменения' : 'Создать задачу'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
