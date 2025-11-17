import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { StockMovement } from "../types";

// Assume API_KEY is set in the environment.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("Gemini API key not found in environment variables. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface SafetySheetResult {
  content: string;
  sources: any[];
}

export const generateSafetySheet = async (productName: string, formula?: string): Promise<SafetySheetResult> => {
  if (!API_KEY) {
    return { content: "**Erreur :** La clé API Gemini n'est pas configurée. Veuillez contacter l'administrateur.", sources: [] };
  }

  const prompt = `
    Generate a concise, up-to-date safety data sheet for the chemical product: "${productName}" ${formula ? `(Formula: ${formula})` : ''}.
    Use the most current information available on the web to ensure accuracy regarding regulations and safety procedures.
    The response must be in French.
    The output should be well-structured markdown.
    Include the following sections:
    1.  **Identification du produit**: Product name and formula.
    2.  **Identification des dangers**: Main hazards and GHS pictograms (list them by name, e.g., Flammable, Corrosive).
    3.  **Premiers secours**: Instructions for eye contact, skin contact, inhalation, and ingestion.
    4.  **Manipulation et stockage**: Precautions for safe handling and storage conditions.
    5.  **Équipement de protection individuelle (EPI)**: Recommended personal protective equipment.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    const content = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return { content, sources };
  } catch (error) {
    console.error("Error calling Gemini API for safety sheet:", error);
    let errorMessage = "**Erreur :** Une erreur est survenue lors de la génération de la fiche de sécurité. Veuillez réessayer.";
    if (error instanceof Error && error.message.includes('429')) {
        errorMessage = "**Erreur :** Trop de requêtes envoyées à l'assistant IA. Veuillez patienter un moment avant de réessayer.";
    }
    return {
        content: errorMessage,
        sources: []
    };
  }
};

export interface AiProductInfo {
  formula: string;
  cas: string;
  ghsPictograms: string[];
}

export interface AiProductInfoResult {
  data: AiProductInfo | null;
  error: string | null;
}

export const getProductInfoFromAI = async (productName: string): Promise<AiProductInfoResult> => {
  if (!API_KEY) {
    console.error("Gemini API key is not configured.");
    return { data: null, error: "La clé API Gemini n'est pas configurée. L'assistant IA est désactivé." };
  }

  const prompt = `
    Provide chemical information for the product: "${productName}".
    Return only a single JSON object matching the provided schema.
    For ghsPictograms, use one or more of the following standardized names:
    'ExplodingBomb', 'Flame', 'FlameOverCircle', 'GasCylinder', 'Corrosion', 'SkullAndCrossbones', 'HealthHazard', 'ExclamationMark', 'Environment'.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            formula: { type: Type.STRING, description: 'The chemical formula.' },
            cas: { type: Type.STRING, description: 'The CAS Registry Number.' },
            ghsPictograms: {
              type: Type.ARRAY,
              description: 'A list of GHS pictogram names.',
              items: { type: Type.STRING },
            },
          },
          required: ['formula', 'cas', 'ghsPictograms'],
        },
      },
    });

    const jsonText = response.text.trim();
    try {
        const parsedJson = JSON.parse(jsonText);
        return { data: parsedJson as AiProductInfo, error: null };
    } catch (parseError) {
        console.error("Error parsing JSON response from Gemini API:", parseError, "Raw text:", jsonText);
        return { data: null, error: "L'assistant IA a renvoyé une réponse inattendue. Veuillez réessayer." };
    }

  } catch (error) {
    console.error("Error calling Gemini API for product info:", error);
    let errorMessage = "Une erreur est survenue lors de la communication avec l'assistant IA. Veuillez réessayer.";
    if (error instanceof Error && error.message.includes('429')) {
        errorMessage = "Trop de requêtes envoyées à l'assistant IA. Veuillez patienter un moment.";
    }
    return { data: null, error: errorMessage };
  }
};

export interface ExtractedProduct {
  code: string;
  name: string;
  stock: number;
}

export interface AiProductExtractResult {
  data: ExtractedProduct[] | null;
  error: string | null;
}

export const extractProductsFromImage = async (base64ImageData: string, mimeType: string): Promise<AiProductExtractResult> => {
  if (!API_KEY) {
    console.error("Gemini API key is not configured.");
    return { data: null, error: "La clé API Gemini n'est pas configurée. L'assistant IA est désactivé." };
  }

  const prompt = `
    Analyze the provided image, which contains a table of chemical products.
    Extract the information from the columns "Code", "Désignation", and "Qte en stock".
    - The "Code" column contains the product code.
    - The "Désignation" column contains the product name.
    - The "Qte en stock" column contains the stock quantity. If this column is empty or contains no number for a row, default the stock quantity to 0.
    
    Return the extracted data as a JSON array of objects, where each object has 'code', 'name', and 'stock' properties.
    The response must be only the JSON array, conforming to the provided schema. Do not include any other text or markdown formatting.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING, description: 'Product code' },
              name: { type: Type.STRING, description: 'Product name from Désignation' },
              stock: { type: Type.NUMBER, description: 'Stock quantity' },
            },
            required: ['code', 'name', 'stock'],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    try {
        const parsedJson = JSON.parse(jsonText);
        return { data: parsedJson as ExtractedProduct[], error: null };
    } catch (parseError) {
        console.error("Error parsing JSON response from Gemini API for product extraction:", parseError, "Raw text:", jsonText);
        return { data: null, error: "L'assistant IA a renvoyé une réponse inattendue. Assurez-vous que l'image est claire." };
    }
  } catch (error) {
    console.error("Error calling Gemini API for product extraction:", error);
    let errorMessage = "Une erreur est survenue lors de l'extraction des données de l'image. Veuillez réessayer.";
    if (error instanceof Error && error.message.includes('429')) {
        errorMessage = "Trop de requêtes envoyées à l'assistant IA. Veuillez patienter un moment.";
    }
    return { data: null, error: errorMessage };
  }
};

export interface AiImageEditResult {
  data: string | null;
  error: string | null;
}

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<AiImageEditResult> => {
  if (!API_KEY) {
    console.error("Gemini API key is not configured.");
    return { data: null, error: "La clé API Gemini n'est pas configurée. L'assistant IA est désactivé." };
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
        return { data: part.inlineData.data, error: null };
      }
    }
    
    return { data: null, error: "L'IA n'a pas retourné d'image modifiée." };

  } catch (error) {
    console.error("Error calling Gemini API for image editing:", error);
    let errorMessage = "Une erreur est survenue lors de l'édition de l'image. Veuillez réessayer.";
    if (error instanceof Error && error.message.includes('429')) {
      errorMessage = "Trop de requêtes envoyées à l'assistant IA. Veuillez patienter un moment.";
    }
    return { data: null, error: errorMessage };
  }
};

const formatMovementsForAI = (movements: StockMovement[]): string => {
    // Limit to the last 200 movements to avoid exceeding token limits
    return movements.slice(0, 200).map(m => 
        `${m.created_at.split('T')[0]}; ${m.product_name}; ${m.change_type}; ${m.quantity_change > 0 ? '+' : ''}${m.quantity_change}; Nouveau Stock: ${m.new_stock_level}`
    ).join('\n');
};

export const generatePredictiveAnalysis = async (movements: StockMovement[]): Promise<string> => {
  if (!API_KEY) return "**Erreur :** La clé API Gemini n'est pas configurée.";
  
  const prompt = `
    En tant qu'expert en gestion d'inventaire, analysez l'historique des mouvements de stock suivant (format: date; produit; type; changement; nouveau stock).
    Identifiez 3 produits présentant un risque de rupture de stock dans un futur proche en vous basant sur leur consommation récente et leur niveau de stock actuel.
    Pour chaque produit identifié, fournissez une brève explication (1-2 phrases) et une recommandation concrète.
    La réponse doit être en français et formatée en markdown. Si les données sont insuffisantes, indiquez-le.

    Données:
    ${formatMovementsForAI(movements)}
  `;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Error in generatePredictiveAnalysis:", error);
    return "Une erreur est survenue lors de l'analyse prédictive.";
  }
};

export const generateMovementAnalysis = async (movements: StockMovement[]): Promise<string> => {
  if (!API_KEY) return "**Erreur :** La clé API Gemini n'est pas configurée.";
  
  const prompt = `
    En tant qu'analyste de données, analysez l'historique des mouvements de stock suivant (format: date; produit; type; changement; nouveau stock) pour y déceler des anomalies.
    Recherchez des schémas inhabituels comme des ajustements de stock très importants et soudains, une activité à des moments inhabituels, ou des corrections de stock fréquentes pour un même produit.
    Listez les anomalies potentielles que vous trouvez avec une brève explication pour chacune.
    La réponse doit être en français et formatée en markdown. S'il n'y a aucune anomalie évidente, mentionnez-le.

    Données:
    ${formatMovementsForAI(movements)}
  `;

  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
  } catch (error) {
    console.error("Error in generateMovementAnalysis:", error);
    return "Une erreur est survenue lors de l'analyse des mouvements.";
  }
};
