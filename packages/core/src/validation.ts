import { ValidationError } from './errors';
import {
  LABEL_COLORS,
  LABEL_NAME_MAX_LENGTH,
  LABEL_NAME_PATTERN,
  type CreateLabelInput,
  type LabelColor,
  type UpdateLabelInput,
} from './label';
import {
  TODO_LABELS_MAX,
  TODO_TITLE_MAX_LENGTH,
  type CreateTodoInput,
  type UpdateTodoInput,
} from './todo';

/*
 * Shape and format checks for untrusted input (e.g. request bodies). Rules that need stored data
 * (label existence, name uniqueness, limits on stored labels) belong to the services.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPresent(value: unknown): boolean {
  return value !== undefined;
}

function parseTitle(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError('"title" is required and must be a string.');
  }
  const title = value.trim();
  if (title.length === 0) {
    throw new ValidationError('"title" must not be empty.');
  }
  if (title.length > TODO_TITLE_MAX_LENGTH) {
    throw new ValidationError(`"title" must be at most ${TODO_TITLE_MAX_LENGTH} characters.`);
  }
  return title;
}

/**
 * Validates a todo's label ids: an array of strings, de-duplicated (first occurrence wins),
 * at most TODO_LABELS_MAX after de-duplication. Existence is checked by the service.
 */
export function parseLabelIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) {
    throw new ValidationError('"labelIds" must be an array of strings.');
  }
  const labelIds = [...new Set<string>(value)];
  if (labelIds.length > TODO_LABELS_MAX) {
    throw new ValidationError(`"labelIds" must contain at most ${TODO_LABELS_MAX} labels.`);
  }
  return labelIds;
}

/** Validates untrusted input (e.g. a request body) and returns a normalized CreateTodoInput. */
export function parseCreateTodoInput(input: unknown): CreateTodoInput {
  const body = isRecord(input) ? input : {};
  const title = parseTitle(body.title);
  const labelIds = isPresent(body.labelIds) ? parseLabelIds(body.labelIds) : [];
  return { title, labelIds };
}

/** Validates untrusted input (e.g. a request body) and returns a partial UpdateTodoInput. */
export function parseUpdateTodoInput(input: unknown): UpdateTodoInput {
  if (!isRecord(input) || (!isPresent(input.completed) && !isPresent(input.labelIds))) {
    throw new ValidationError('Provide at least one of "completed" or "labelIds".');
  }
  const update: UpdateTodoInput = {};
  if (isPresent(input.completed)) {
    if (typeof input.completed !== 'boolean') {
      throw new ValidationError('"completed" must be a boolean.');
    }
    update.completed = input.completed;
  }
  if (isPresent(input.labelIds)) {
    update.labelIds = parseLabelIds(input.labelIds);
  }
  return update;
}

/** Unicode NFC, trimmed, every run of whitespace collapsed to one space. Casing is preserved. */
export function normalizeLabelName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ');
}

function parseLabelName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ValidationError('"name" is required and must be a string.');
  }
  const name = normalizeLabelName(value);
  if (name.length === 0) {
    throw new ValidationError('"name" must not be empty.');
  }
  if (name.length > LABEL_NAME_MAX_LENGTH) {
    throw new ValidationError(`"name" must be at most ${LABEL_NAME_MAX_LENGTH} characters.`);
  }
  if (!LABEL_NAME_PATTERN.test(name)) {
    throw new ValidationError(
      `"name" must start with a letter or digit and may only contain letters, digits, spaces and - _ & ' . /`,
    );
  }
  return name;
}

function isLabelColor(value: unknown): value is LabelColor {
  return typeof value === 'string' && (LABEL_COLORS as readonly string[]).includes(value);
}

function parseLabelColor(value: unknown): LabelColor {
  if (!isLabelColor(value)) {
    throw new ValidationError(`"color" must be one of: ${LABEL_COLORS.join(', ')}.`);
  }
  return value;
}

/** Validates untrusted input and returns a CreateLabelInput with a normalized name. */
export function parseCreateLabelInput(input: unknown): CreateLabelInput {
  const body = isRecord(input) ? input : {};
  const name = parseLabelName(body.name);
  return isPresent(body.color) ? { name, color: parseLabelColor(body.color) } : { name };
}

/** Validates untrusted input and returns a partial UpdateLabelInput with a normalized name. */
export function parseUpdateLabelInput(input: unknown): UpdateLabelInput {
  if (!isRecord(input) || (!isPresent(input.name) && !isPresent(input.color))) {
    throw new ValidationError('Provide at least one of "name" or "color".');
  }
  const update: UpdateLabelInput = {};
  if (isPresent(input.name)) update.name = parseLabelName(input.name);
  if (isPresent(input.color)) update.color = parseLabelColor(input.color);
  return update;
}
