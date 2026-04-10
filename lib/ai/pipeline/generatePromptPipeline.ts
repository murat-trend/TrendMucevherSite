import type {
  BuiltPrompt,
  JewelryIntent,
  SupportedLanguage,
  ValidationResult,
} from "../types/prompt.types";
import {
  enrichIntentFromRawNarrativeOpenAI,
  InterpreterService,
} from "../interpreter/interpreter.service";
import { RuleEngineService } from "../interpreter/rule-engine.service";
import { FinalPromptBuilder } from "../builder/finalPrompt.builder";
import { PromptValidator } from "../validator/prompt.validator";

export type PromptPipelineResult = {
  intent: JewelryIntent;
  validation: ValidationResult;
  output: BuiltPrompt;
};

export async function generatePromptPipeline(
  rawPrompt: string,
  language: SupportedLanguage = "tr",
  mode3DExport?: boolean,
  openAiApiKey?: string
): Promise<PromptPipelineResult> {
  const interpreterService = new InterpreterService();
  const ruleEngineService = new RuleEngineService();
  const finalPromptBuilder = new FinalPromptBuilder();
  const promptValidator = new PromptValidator();

  let step = "interpreter.parse";

  try {
    const parsedIntent = interpreterService.parse(rawPrompt, language, mode3DExport);
    step = "ruleEngine.apply";
    const normalizedIntent = ruleEngineService.apply(parsedIntent);

    let intentForBuild = normalizedIntent;
    if (openAiApiKey && mode3DExport !== true) {
      step = "enrichIntentFromRawNarrativeOpenAI";
      intentForBuild = await enrichIntentFromRawNarrativeOpenAI(
        intentForBuild,
        openAiApiKey,
        mode3DExport
      );
    }

    step = "promptValidator.validate";
    const validation = promptValidator.validate(intentForBuild);
    step = "finalPromptBuilder.build";
    const output = finalPromptBuilder.build(intentForBuild, mode3DExport);

    return {
      intent: intentForBuild,
      validation,
      output,
    };
  } catch (err) {
    console.error(`[prompt-pipeline] hata (adım: ${step}):`, err);
    throw new Error("Prompt oluşturulamadı. Lütfen tekrar deneyin.");
  }
}
