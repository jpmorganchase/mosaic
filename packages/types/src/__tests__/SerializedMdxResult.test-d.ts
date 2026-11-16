import type { SerializedMdxResult } from '../SerializedMdxResult.js';

type Assert<T extends true> = T;
type Assignable<Source, Target> = [Source] extends [Target] ? true : false;

interface Frontmatter {
  title: string;
}

interface Scope {
  count: number;
}

type Result = SerializedMdxResult<Frontmatter, Scope>;

export type DefaultFrontmatter = Assert<
  Assignable<SerializedMdxResult['frontmatter'], Record<string, unknown>>
>;
export type DefaultScope = Assert<
  Assignable<SerializedMdxResult['scope'], Record<string, unknown>>
>;
export type CustomFrontmatter = Assert<Assignable<Result['frontmatter'], Frontmatter>>;
export type CustomScope = Assert<Assignable<Result['scope'], Scope>>;
export type Success = Assert<
  Assignable<{ compiledSource: string; frontmatter: Frontmatter; scope: Scope }, Result>
>;
export type Failure = Assert<
  Assignable<{ error: Error; frontmatter: Frontmatter; scope: Scope }, Result>
>;
export type SuccessNarrowing = Assert<
  Assignable<Extract<Result, { compiledSource: string }>['compiledSource'], string>
>;
export type FailureNarrowing = Assert<
  Assignable<Extract<Result, { error: Error }>['error'], Error>
>;

// @ts-expect-error A payload must contain either compiled source or an error.
export type MissingOutcome = Assert<Assignable<{ frontmatter: Frontmatter; scope: Scope }, Result>>;
// @ts-expect-error Frontmatter and scope remain required on errors too.
export type MissingMetadata = Assert<Assignable<{ error: Error }, Result>>;
export type InvalidError = Assert<
  // @ts-expect-error The protocol carries an Error object, not just its message.
  Assignable<{ error: string; frontmatter: Frontmatter; scope: Scope }, Result>
>;
