export type Classifiers = 'emotions' | 'evidence_types' | 'websites' | 'wellformedness' | 'zero_shot';

export const EmotionsLabels = [
  'admiration',
  'amusement',
  'anger',
  'annoyance',
  'approval',
  'caring',
  'confusion',
  'curiosity',
  'desire',
  'disappointment',
  'disapproval',
  'disgust',
  'embarrassment',
  'excitement',
  'fear',
  'gratitude',
  'grief',
  'joy',
  'love',
  'nervousness',
  'optimism',
  'pride',
  'realization',
  'relief',
  'remorse',
  'sadness',
  'surprise',
  'neutral'
];

export const EvidenceTypes = ['Anecdote', 'Assumption', 'Definition', 'Null', 'Other', 'Statistics', 'Testimony'];

export const WebsiteLabels = [
  'Travel',
  'SocialNetworkingAndMessaging',
  'News',
  'StreamingServices',
  'Sports',
  'Photography',
  'LawAndGovernment',
  'HealthAndFitness',
  'Games',
  'ECommerce',
  'Forums',
  'Food',
  'Education',
  'ComputersAndTechnology',
  'BusinessOrCorporate',
  'Adult'
];

export type TextClassificationRequestOptions<C extends Classifiers> = {
  classifiers?: C[];
};
export type TextClassificationRequest<C extends Classifiers = Classifiers> = {
  text: string[];
  zero_shot_labels: string[];
  options?: TextClassificationRequestOptions<C>;
};
export type TextClassificationResponse = {
  emotions?: Record<number, number>;
  evidence_types?: Record<number, number>;
  websites?: Record<number, number>;
  zero_shot?: Record<string, number>;
  wellformedness?: number;
}[];
export type TextClassificationAlteredResponse = {
  emotions?: Record<string, number>;
  evidence_types?: Record<string, number>;
  websites?: Record<string, number>;
  zero_shot?: Record<string, number>;
  wellformedness?: number;
}[];

export const getAlteredResponse = (
  resp: TextClassificationResponse,
  zero_shot_labels: string[]
): TextClassificationAlteredResponse =>
  resp.map(({ emotions, evidence_types, websites, wellformedness, zero_shot }) => ({
    emotions: emotions
      ? Object.fromEntries(Object.entries(emotions).map(([k, v]) => [EmotionsLabels[parseInt(`${k}`)], v]))
      : undefined,
    evidence_types: evidence_types
      ? Object.fromEntries(Object.entries(evidence_types).map(([k, v]) => [EvidenceTypes[parseInt(`${k}`)], v]))
      : undefined,
    websites: websites
      ? Object.fromEntries(Object.entries(websites).map(([k, v]) => [WebsiteLabels[parseInt(`${k}`)], v]))
      : undefined,
    zero_shot: zero_shot
      ? Object.fromEntries(Object.entries(zero_shot).map(([k, v]) => [zero_shot_labels[parseInt(`${k}`)], v]))
      : undefined,
    wellformedness
  }));
