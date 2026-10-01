/**
 * Public domain API for MockForge Studio.
 *
 * Keeping this entry point stable lets consumers import the contract without knowing
 * whether a capability lives in the model, fictional examples, import validation or
 * Markdown rendering. Leaf modules import the model directly to avoid circular imports.
 */
export * from './project.model';
export * from './project.examples';
export * from './project.validation';
export * from './project.handoff';
