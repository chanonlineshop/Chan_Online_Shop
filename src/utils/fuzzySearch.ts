import { Product } from '../types';

/**
 * Calculates Damerau-Levenshtein distance between two strings:
 * - Insertions
 * - Deletions
 * - Substitutions
 * - Transpositions of adjacent characters (e.g., "teh" -> "the", "erabuds" -> "earbuds")
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  if (a === b) return 0;

  const d: number[][] = [];
  for (let i = 0; i <= al; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,        // deletion
        d[i][j - 1] + 1,        // insertion
        d[i - 1][j - 1] + cost   // substitution
      );

      // Adjacent transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[al][bl];
}

/**
 * Normalizes and tokenizes text:
 * - Lowercases and strips punctuation
 * - Splits into individual tokens
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/[\s_-]+/)
    .filter(t => t.length > 0);
}

/**
 * Simple English stemmer for common suffixes (s, es, ed, ing)
 * to enhance singular/plural matching.
 */
export function stripSuffix(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  return word;
}

/**
 * Allowed maximum edit distance based on token length:
 * - Length 1-3: 0 (exact / prefix match only to avoid false matches on short acronyms like '4k', 'gps', 'pro')
 * - Length 4-5: 1 edit (e.g. "cabl" -> "cable", "wath" -> "watch", "charg" -> "charge")
 * - Length 6+: 2 edits (e.g. "wirles" -> "wireless", "keybord" -> "keyboard", "powrbank" -> "powerbank", "earbds" -> "earbuds")
 */
export function maxAllowedDistance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  return 2;
}

export interface MatchScore {
  matched: boolean;
  score: number;
  isExact: boolean;
  matchedToken?: string;
  targetToken?: string;
}

/**
 * Evaluates how well a query token matches a target token.
 * Returns score from 0 to 100.
 */
export function matchToken(queryToken: string, targetToken: string): MatchScore {
  // 1. Exact match
  if (queryToken === targetToken) {
    return { matched: true, score: 100, isExact: true, matchedToken: queryToken, targetToken };
  }

  // 2. Singular/Plural stem match
  const qStem = stripSuffix(queryToken);
  const tStem = stripSuffix(targetToken);
  if (qStem === tStem || qStem === targetToken || queryToken === tStem) {
    return { matched: true, score: 96, isExact: true, matchedToken: queryToken, targetToken };
  }

  // 3. Prefix match (e.g., "ear" matching "earbuds", "charg" matching "charger")
  if (targetToken.startsWith(queryToken)) {
    const ratio = queryToken.length / targetToken.length;
    return {
      matched: true,
      score: 82 + Math.round(ratio * 14),
      isExact: false,
      matchedToken: queryToken,
      targetToken,
    };
  }

  // 4. Target is prefix of query (e.g., query "earbudspro" vs "earbuds")
  if (queryToken.startsWith(targetToken) && targetToken.length >= 3) {
    return {
      matched: true,
      score: 80,
      isExact: false,
      matchedToken: queryToken,
      targetToken,
    };
  }

  // 5. Substring match (e.g. "watch" in "smartwatch" or "banck" in "powerbank")
  if (targetToken.includes(queryToken)) {
    const ratio = queryToken.length / targetToken.length;
    return {
      matched: true,
      score: 75 + Math.round(ratio * 15),
      isExact: false,
      matchedToken: queryToken,
      targetToken,
    };
  }

  // 6. Fuzzy edit distance match
  const maxLen = Math.max(queryToken.length, targetToken.length);
  const allowed = maxAllowedDistance(queryToken.length);

  if (allowed > 0) {
    // Direct distance
    const dist = damerauLevenshteinDistance(queryToken, targetToken);
    if (dist <= allowed) {
      const similarity = 1 - dist / maxLen;
      // High score for 1 edit, good score for 2 edits
      const score = Math.round(58 + similarity * 32);
      return {
        matched: true,
        score,
        isExact: false,
        matchedToken: queryToken,
        targetToken,
      };
    }

    // Stemmed distance (e.g. "wirles" vs "wireless" -> stems "wirles" and "wireles")
    const stemDist = damerauLevenshteinDistance(qStem, tStem);
    if (stemDist <= allowed) {
      const similarity = 1 - stemDist / Math.max(qStem.length, tStem.length);
      const score = Math.round(55 + similarity * 30);
      return {
        matched: true,
        score,
        isExact: false,
        matchedToken: queryToken,
        targetToken,
      };
    }

    // Substring fuzzy match for compound words (e.g., "bank" inside "powerbank")
    if (targetToken.length > queryToken.length && queryToken.length >= 4) {
      for (let i = 0; i <= targetToken.length - queryToken.length; i++) {
        const slice = targetToken.slice(i, i + queryToken.length);
        const subDist = damerauLevenshteinDistance(queryToken, slice);
        if (subDist <= 1) {
          return {
            matched: true,
            score: 68,
            isExact: false,
            matchedToken: queryToken,
            targetToken,
          };
        }
      }
    }
  }

  return { matched: false, score: 0, isExact: false };
}

export interface FuzzySearchResult {
  product: Product;
  score: number;
  isExactMatch: boolean;
  hasFuzzyMatch: boolean;
  matchedFields: string[];
}

export interface CatalogSearchOutcome {
  results: Product[];
  scoredResults: FuzzySearchResult[];
  totalMatches: number;
  hasFuzzyMatches: boolean;
  suggestion?: string; // "Did you mean?" suggestion
  correctedQuery?: string;
  isCorrectedQueryDifferent: boolean;
}

/**
 * Searches a catalog of products using multi-tier fuzzy matching:
 * 1. Tokenizes search query
 * 2. Compares query tokens against product name, category, brand, SKU, barcode, features, description
 * 3. Applies weights according to field importance
 * 4. Filters products that meet match thresholds
 * 5. Orders by match quality score
 * 6. Generates intelligent "Did you mean?" suggestions from catalog vocabulary
 */
export function fuzzySearchProducts(
  products: Product[],
  query: string,
  categoryFilter: string = 'All'
): CatalogSearchOutcome {
  const trimmed = query.trim();

  // If query is empty, apply standard category filter
  if (!trimmed) {
    const filtered = categoryFilter === 'All' 
      ? products 
      : products.filter(p => p.category === categoryFilter);

    return {
      results: filtered,
      scoredResults: filtered.map(p => ({
        product: p,
        score: 100,
        isExactMatch: true,
        hasFuzzyMatch: false,
        matchedFields: [],
      })),
      totalMatches: filtered.length,
      hasFuzzyMatches: false,
      isCorrectedQueryDifferent: false,
    };
  }

  const queryTokens = tokenize(trimmed);
  const normalizedQuery = trimmed.toLowerCase();
  const normalizedCompactQuery = normalizedQuery.replace(/\s+/g, '');

  // Extract catalog vocabulary for "Did you mean?" suggestions
  const vocabularyMap = new Map<string, number>(); // word -> frequency
  products.forEach(p => {
    tokenize(p.name).forEach(w => vocabularyMap.set(w, (vocabularyMap.get(w) || 0) + 4));
    if (p.brand) tokenize(p.brand).forEach(w => vocabularyMap.set(w, (vocabularyMap.get(w) || 0) + 3));
    tokenize(p.category).forEach(w => vocabularyMap.set(w, (vocabularyMap.get(w) || 0) + 2));
    (p.features || []).forEach(f => {
      tokenize(f).forEach(w => vocabularyMap.set(w, (vocabularyMap.get(w) || 0) + 1));
    });
  });

  const scoredList: FuzzySearchResult[] = [];

  for (const product of products) {
    // Check category constraint
    if (categoryFilter !== 'All' && product.category !== categoryFilter) {
      continue;
    }

    const nameTokens = tokenize(product.name);
    const categoryTokens = tokenize(product.category);
    const brandTokens = tokenize(product.brand || '');
    const skuTokens = tokenize(product.sku);
    const barcodeTokens = tokenize(product.barcode || '');
    const featureTokens = tokenize((product.features || []).join(' '));
    const descTokens = tokenize(product.description || '');

    const fields: Array<{ name: string; tokens: string[]; weight: number; fullText: string }> = [
      { name: 'name', tokens: nameTokens, weight: 3.5, fullText: product.name.toLowerCase() },
      { name: 'brand', tokens: brandTokens, weight: 2.8, fullText: (product.brand || '').toLowerCase() },
      { name: 'sku', tokens: skuTokens, weight: 3.0, fullText: product.sku.toLowerCase() },
      { name: 'barcode', tokens: barcodeTokens, weight: 3.0, fullText: (product.barcode || '').toLowerCase() },
      { name: 'category', tokens: categoryTokens, weight: 2.0, fullText: product.category.toLowerCase() },
      { name: 'features', tokens: featureTokens, weight: 1.6, fullText: (product.features || []).join(' ').toLowerCase() },
      { name: 'description', tokens: descTokens, weight: 1.0, fullText: (product.description || '').toLowerCase() },
    ];

    let totalScore = 0;
    let tokensMatchedCount = 0;
    let isAllExact = true;
    let hasAnyFuzzy = false;
    const matchedFieldsSet = new Set<string>();

    // Instant exact full-phrase or compact match bonus
    for (const field of fields) {
      if (field.fullText.includes(normalizedQuery)) {
        totalScore += 120 * field.weight;
        matchedFieldsSet.add(field.name);
      } else {
        const compactFieldText = field.fullText.replace(/\s+/g, '');
        if (compactFieldText.includes(normalizedCompactQuery)) {
          totalScore += 100 * field.weight;
          matchedFieldsSet.add(field.name);
        }
      }
    }

    // Check each query token against the product's fields
    for (const qToken of queryTokens) {
      let bestTokenScore = 0;
      let tokenExact = false;
      let matchedFieldName = '';

      for (const field of fields) {
        for (const tToken of field.tokens) {
          const res = matchToken(qToken, tToken);
          if (res.matched) {
            const weightedScore = res.score * field.weight;
            if (weightedScore > bestTokenScore) {
              bestTokenScore = weightedScore;
              tokenExact = res.isExact;
              matchedFieldName = field.name;
            }
          }
        }
      }

      if (bestTokenScore > 0) {
        tokensMatchedCount++;
        totalScore += bestTokenScore;
        if (!tokenExact) {
          isAllExact = false;
          hasAnyFuzzy = true;
        }
        if (matchedFieldName) {
          matchedFieldsSet.add(matchedFieldName);
        }
      } else {
        isAllExact = false;
      }
    }

    // Require all tokens to match if 1 or 2 tokens, or >= 65% if 3+ tokens
    const minTokensRequired = queryTokens.length <= 2 
      ? queryTokens.length 
      : Math.ceil(queryTokens.length * 0.65);

    if (tokensMatchedCount >= minTokensRequired && totalScore > 0) {
      // Normalization factor based on query coverage
      const coverageRatio = tokensMatchedCount / queryTokens.length;
      let finalScore = Math.round(totalScore * coverageRatio);

      // Bonus if product name begins with the search query or first token
      if (nameTokens.length > 0 && queryTokens.length > 0) {
        if (nameTokens[0].startsWith(queryTokens[0])) {
          finalScore += 40;
        }
      }

      scoredList.push({
        product,
        score: finalScore,
        isExactMatch: isAllExact && tokensMatchedCount === queryTokens.length,
        hasFuzzyMatch: hasAnyFuzzy,
        matchedFields: Array.from(matchedFieldsSet),
      });
    }
  }

  // Sort descending by score
  scoredList.sort((a, b) => {
    // 1. Exact matches first
    if (a.isExactMatch && !b.isExactMatch) return -1;
    if (!a.isExactMatch && b.isExactMatch) return 1;
    // 2. Score ranking
    if (b.score !== a.score) return b.score - a.score;
    // 3. Featured products tie-breaker
    if (a.product.isFeatured && !b.product.isFeatured) return -1;
    if (!a.product.isFeatured && b.product.isFeatured) return 1;
    return 0;
  });

  // Calculate "Did you mean?" suggestions from catalog vocabulary
  let suggestion: string | undefined;
  const correctedQueryTokens: string[] = [];
  let isDifferent = false;

  const vocabularyList = Array.from(vocabularyMap.keys());

  for (const qToken of queryTokens) {
    if (vocabularyMap.has(qToken) || qToken.length <= 2) {
      correctedQueryTokens.push(qToken);
      continue;
    }

    // Find closest vocabulary word within allowed edit distance
    let bestWord = qToken;
    let lowestDist = 999;
    let highestFreq = 0;
    const allowed = maxAllowedDistance(qToken.length);

    for (const vocabWord of vocabularyList) {
      if (Math.abs(vocabWord.length - qToken.length) > allowed) continue;
      const dist = damerauLevenshteinDistance(qToken, vocabWord);

      if (dist <= allowed && dist > 0) {
        const freq = vocabularyMap.get(vocabWord) || 0;
        if (dist < lowestDist || (dist === lowestDist && freq > highestFreq)) {
          lowestDist = dist;
          bestWord = vocabWord;
          highestFreq = freq;
        }
      }
    }

    if (bestWord !== qToken) {
      isDifferent = true;
    }
    correctedQueryTokens.push(bestWord);
  }

  if (isDifferent) {
    suggestion = correctedQueryTokens.join(' ');
  }

  const results = scoredList.map(item => item.product);
  const hasFuzzyMatches = scoredList.some(item => item.hasFuzzyMatch || !item.isExactMatch);

  return {
    results,
    scoredResults: scoredList,
    totalMatches: results.length,
    hasFuzzyMatches,
    suggestion: isDifferent ? suggestion : undefined,
    correctedQuery: suggestion,
    isCorrectedQueryDifferent: isDifferent,
  };
}
