import { randomUUID } from 'node:crypto';
import { LabelLimitReachedError, LabelNameTakenError, LabelNotFoundError } from './errors';
import { LABELS_MAX, labelNameKey, sortLabels, suggestLabelColor, type Label } from './label';
import type { StoreData, TodoStore } from './store/todo-store';
import { parseCreateLabelInput, parseUpdateLabelInput } from './validation';

export interface LabelServiceDeps {
  store: TodoStore;
  now?: () => Date;
  generateId?: () => string;
}

function findLabel(data: StoreData, id: string): Label {
  const label = data.labels.find((candidate) => candidate.id === id);
  if (!label) throw new LabelNotFoundError(id);
  return label;
}

/** Names are unique case-insensitively; `exceptId` lets a label change the casing of its own name. */
function assertNameAvailable(data: StoreData, name: string, exceptId?: string): void {
  const key = labelNameKey(name);
  const clash = data.labels.find(
    (label) => label.id !== exceptId && labelNameKey(label.name) === key,
  );
  if (clash) throw new LabelNameTakenError(clash.name);
}

/**
 * Application service for labels. Every read-then-write rule (limit, uniqueness, delete cascade)
 * runs inside one store transaction, so concurrent requests cannot break them.
 */
export class LabelService {
  private readonly store: TodoStore;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor({ store, now = () => new Date(), generateId = randomUUID }: LabelServiceDeps) {
    this.store = store;
    this.now = now;
    this.generateId = generateId;
  }

  /** Every label, alphabetical (see sortLabels). */
  async list(): Promise<Label[]> {
    const { labels } = await this.store.read();
    return sortLabels(labels);
  }

  /** The limit is checked first: with LABELS_MAX labels the answer is always LABEL_LIMIT_REACHED. */
  async create(input: unknown): Promise<Label> {
    const { name, color } = parseCreateLabelInput(input);
    return this.store.transaction((draft) => {
      if (draft.labels.length >= LABELS_MAX) throw new LabelLimitReachedError();
      assertNameAvailable(draft, name);
      const label: Label = {
        id: this.generateId(),
        name,
        color: color ?? suggestLabelColor(draft.labels),
        createdAt: this.now().toISOString(),
      };
      draft.labels.push(label);
      return label;
    });
  }

  /** Partial update (rename and/or recolor). The id never changes. */
  async update(id: string, input: unknown): Promise<Label> {
    const { name, color } = parseUpdateLabelInput(input);
    return this.store.transaction((draft) => {
      const label = findLabel(draft, id);
      if (name !== undefined) {
        assertNameAvailable(draft, name, id);
        label.name = name;
      }
      if (color !== undefined) label.color = color;
      return label;
    });
  }

  /** Deletes the label and removes its id from every todo in the same write. Todos are kept. */
  async remove(id: string): Promise<void> {
    await this.store.transaction((draft) => {
      findLabel(draft, id);
      draft.labels = draft.labels.filter((label) => label.id !== id);
      for (const todo of draft.todos) {
        todo.labelIds = todo.labelIds.filter((labelId) => labelId !== id);
      }
    });
  }
}
