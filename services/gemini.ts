// Google Gemini AI integration service for HTR
import { Activity } from '@/types';

export interface GeminiEnhancementResult {
  activitiesByDay: Record<number, Activity[]>;
  difficulties: string[];
  perspectives: string[];
  summary?: string;
}

export const GeminiService = {
  async testApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'Veuillez saisir une clé API Gemini.' };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Test de connexion. Réponds simplement: OK' }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, error: `Clé API invalide (${response.status}): ${err}` };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Impossible de contacter l’API Gemini' };
    }
  },

  async improveReport(
    activitiesByDay: Record<number, Activity[]>,
    difficulties: string[],
    perspectives: string[],
    customApiKey?: string | null
  ): Promise<{ success: boolean; result?: GeminiEnhancementResult; error?: string }> {
    const apiKey =
      customApiKey ||
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      '';

    if (!apiKey) {
      // Fallback client-side rule-based enhancement if no API key is provided
      const enhancedActivities: Record<number, Activity[]> = {};
      Object.keys(activitiesByDay).forEach((dayKey) => {
        const d = Number(dayKey);
        enhancedActivities[d] = (activitiesByDay[d] || []).map((act) => ({
          ...act,
          title: act.title.charAt(0).toUpperCase() + act.title.slice(1),
          description: act.description
            ? `Réalisation corporate : ${act.description}`
            : undefined,
        }));
      });

      return {
        success: true,
        result: {
          activitiesByDay: enhancedActivities,
          difficulties: difficulties.map((d) => `Point d'attention technique : ${d}`),
          perspectives: perspectives.map((p) => `Priorité stratégique : ${p}`),
          summary: "Synthèse d'activité optimisée par HTR Intelligence.",
        },
      };
    }

    const prompt = `
Tu es un assistant exécutif senior pour HINOV Group.
Améliore la clarté, l'impact et la formulation professionnelle de ce rapport d'activité hebdomadaire.

RÈGLES CAPITALES :
1. RESPECTE ABSOLUMENT la répartition par jour (Lundi, Mardi, Mercredi, Jeudi, Vendredi). Ne déplace pas d'activités entre les jours.
2. Conserve rigoureusement les faits réels. Ne fabrique aucune mission inventée.
3. Adopte un ton dynamique, concis et corporate digne d'un rapport de direction.
4. Réponds UNIQUEMENT avec un JSON pur respectant cette structure exacte :

{
  "activitiesByDay": {
    "1": [{"id": "...", "title": "...", "description": "...", "status": "terminee|en_cours|en_attente", "category": "..."}],
    "2": [...],
    "3": [...],
    "4": [...],
    "5": [...]
  },
  "difficulties": ["...", "..."],
  "perspectives": ["...", "..."],
  "summary": "Résumé exécutif en 2 phrases."
}

DONNÉES BRUTES :
Activités par jour : ${JSON.stringify(activitiesByDay)}
Difficultés : ${JSON.stringify(difficulties)}
Perspectives : ${JSON.stringify(perspectives)}
`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, error: `Erreur Gemini API (${response.status}): ${err}` };
      }

      const json = await response.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      let cleanText = rawText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }

      const parsed: GeminiEnhancementResult = JSON.parse(cleanText.trim());

      return { success: true, result: parsed };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur lors de l’analyse Gemini' };
    }
  },
};

