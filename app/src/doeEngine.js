// Client-side 2^k Full Factorial DOE Statistical Engine
// Supports k = 2..5 factors (numeric & categorical), replicates r = 1..4, center points,
// full & sequential pooled models, Lack-of-Fit ANOVA, residuals, optimizer, and 1-sample t-test + AD normality.

export const FACTOR_SYMBOLS = ['A', 'B', 'C', 'D', 'E'];

// ==========================================
// 1. Statistical Distribution Helpers
// ==========================================
export function probit(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  if (p <= 0) return -3.5;
  if (p >= 1) return 3.5;
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - 0.02425) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

export function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-0.5 * z * z);
  const p = d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

function logGamma(z) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.138571095836526, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  let zz = z - 1;
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (zz + i);
  const t = zz + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (zz + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a, b, x) {
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 120; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-8) break;
  }
  return h;
}

export function betainc(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
  return 1 - bt * betacf(b, a, 1 - x) / b;
}

export function fPValue(f, df1, df2) {
  if (!Number.isFinite(f) || f <= 0 || df1 <= 0 || df2 <= 0) return 1.0;
  const x = (df1 * f) / (df1 * f + df2);
  return Math.max(0, Math.min(1, 1.0 - betainc(x, df1 / 2, df2 / 2)));
}

export function tPValueTwoSided(t, df) {
  if (!Number.isFinite(t) || df <= 0) return 1.0;
  const x = df / (df + t * t);
  return Math.max(0, Math.min(1, betainc(x, df / 2, 0.5)));
}

export function tCriticalTwoSided(alpha, df) {
  if (df <= 0) return 2.0;
  let lo = 0, hi = 30;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (tPValueTwoSided(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ==========================================
// 2. Design Matrix & Factor Term Generation
// ==========================================
export function seededRandom(seed) {
  let s = (Number(seed) || 1) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateTerms(factors) {
  const k = factors.length;
  const terms = [];
  for (let order = 1; order <= k; order++) {
    const combine = (start, chosen) => {
      if (chosen.length === order) {
        const key = chosen.map(i => factors[i].symbol).join('');
        const label = chosen.map(i => factors[i].symbol).join('*');
        const name = chosen.map(i => factors[i].name || factors[i].symbol).join(' × ');
        terms.push({
          key,
          label,
          name,
          order,
          indices: [...chosen],
        });
        return;
      }
      for (let i = start; i < k; i++) {
        combine(i + 1, [...chosen, i]);
      }
    };
    combine(0, []);
  }
  return terms;
}

export function codedToActualVal(factor, coded) {
  if (factor.type === 'categorical') {
    return coded >= 0 ? String(factor.highVal) : String(factor.lowVal);
  }
  const lo = parseFloat(factor.lowVal);
  const hi = parseFloat(factor.highVal);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return coded >= 0 ? factor.highVal : factor.lowVal;
  const val = lo + ((coded + 1) / 2) * (hi - lo);
  return Number(val.toFixed(4));
}

export function actualToCodedVal(factor, actual) {
  if (factor.type === 'categorical') {
    return String(actual) === String(factor.highVal) ? 1 : -1;
  }
  const lo = parseFloat(factor.lowVal);
  const hi = parseFloat(factor.highVal);
  const v = parseFloat(actual);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo || !Number.isFinite(v)) return 0;
  return ((v - lo) / (hi - lo)) * 2 - 1;
}

export function generateDesignRuns({
  factors,
  replicates = 1,
  centerPoints = 0,
  seed = 1,
  randomize = false,
  existingY = {},
}) {
  const k = factors.length;
  const baseCount = 1 << k;
  const runs = [];
  let stdIdx = 1;

  for (let rep = 1; rep <= replicates; rep++) {
    for (let i = 0; i < baseCount; i++) {
      const coded = {};
      const actual = {};
      factors.forEach((f, fIdx) => {
        const bit = (i >> fIdx) & 1;
        const c = bit === 1 ? 1 : -1;
        coded[f.symbol] = c;
        actual[f.symbol] = c === 1 ? f.highVal : f.lowVal;
      });
      const id = `std_${stdIdx}`;
      runs.push({
        id,
        stdOrder: stdIdx,
        runOrder: stdIdx,
        rep,
        isCenter: false,
        treatmentIdx: i,
        coded,
        actual,
        y: existingY[id] !== undefined ? existingY[id] : '',
      });
      stdIdx++;
    }
  }

  for (let c = 1; c <= centerPoints; c++) {
    const coded = {};
    const actual = {};
    factors.forEach(f => {
      coded[f.symbol] = 0;
      if (f.type === 'categorical') {
        actual[f.symbol] = f.lowVal;
      } else {
        const lo = parseFloat(f.lowVal) || 0;
        const hi = parseFloat(f.highVal) || 0;
        actual[f.symbol] = Number(((lo + hi) / 2).toFixed(4));
      }
    });
    const id = `std_${stdIdx}`;
    runs.push({
      id,
      stdOrder: stdIdx,
      runOrder: stdIdx,
      rep: 1,
      isCenter: true,
      treatmentIdx: -1,
      coded,
      actual,
      y: existingY[id] !== undefined ? existingY[id] : '',
    });
    stdIdx++;
  }

  if (randomize) {
    const rng = seededRandom(seed);
    const order = runs.map((_, idx) => idx);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((origIdx, newIdx) => {
      runs[origIdx].runOrder = newIdx + 1;
    });
    runs.sort((a, b) => a.runOrder - b.runOrder);
  }

  return runs;
}

// ==========================================
// 3. Full & Reduced Factorial Statistical Analysis
// ==========================================
export function analyzeDOE({ factors, runs, pooledKeys = [], alpha = 0.05 }) {
  const validRuns = runs.filter(r => r.y !== '' && r.y !== null && Number.isFinite(parseFloat(r.y)));
  if (validRuns.length < 4) {
    return null;
  }

  const factorialRuns = validRuns.filter(r => !r.isCenter);
  const centerRuns = validRuns.filter(r => r.isCenter);
  const N = validRuns.length;
  const NFact = factorialRuns.length;
  const k = factors.length;
  const terms = generateTerms(factors);

  const yValues = validRuns.map(r => parseFloat(r.y));
  const grandSum = yValues.reduce((a, b) => a + b, 0);
  const grandMean = grandSum / N;
  const totalSS = yValues.reduce((s, y) => s + (y - grandMean) ** 2, 0);
  const totalDF = N - 1;

  // Factorial mean (if center points exist, intercept is factorial mean or grand mean)
  const factMean = NFact > 0 ? factorialRuns.reduce((s, r) => s + parseFloat(r.y), 0) / NFact : grandMean;

  // Pure Error from replicate treatments + center points
  const groups = {};
  factorialRuns.forEach(r => {
    const key = factors.map(f => r.coded[f.symbol]).join(',');
    if (!groups[key]) groups[key] = [];
    groups[key].push(parseFloat(r.y));
  });
  let pureErrorSS = 0;
  let pureErrorDF = 0;
  Object.values(groups).forEach(arr => {
    if (arr.length > 1) {
      const m = arr.reduce((a, b) => a + b, 0) / arr.length;
      pureErrorSS += arr.reduce((s, v) => s + (v - m) ** 2, 0);
      pureErrorDF += arr.length - 1;
    }
  });
  if (centerRuns.length > 1) {
    const cm = centerRuns.reduce((s, r) => s + parseFloat(r.y), 0) / centerRuns.length;
    pureErrorSS += centerRuns.reduce((s, r) => s + (parseFloat(r.y) - cm) ** 2, 0);
    pureErrorDF += centerRuns.length - 1;
  }

  // Orthogonal factorial estimates
  const rawTerms = terms.map(term => {
    let contrastSum = 0;
    factorialRuns.forEach(r => {
      let sign = 1;
      term.indices.forEach(idx => {
        sign *= r.coded[factors[idx].symbol];
      });
      contrastSum += sign * parseFloat(r.y);
    });
    const coef = NFact > 0 ? contrastSum / NFact : 0;
    const effect = 2 * coef;
    const ss = NFact > 0 ? (contrastSum * contrastSum) / NFact : 0;
    return {
      ...term,
      contrast: contrastSum,
      effect,
      coef,
      ss,
      df: 1,
      ms: ss,
      isPooled: pooledKeys.includes(term.key),
    };
  });

  const activeTerms = rawTerms.filter(t => !t.isPooled);
  const pooledTerms = rawTerms.filter(t => t.isPooled);

  const modelSS = activeTerms.reduce((s, t) => s + t.ss, 0);
  const modelDF = activeTerms.length;

  const errorDF = totalDF - modelDF;
  const errorSS = Math.max(0, totalSS - modelSS);
  const errorMS = errorDF > 0 ? errorSS / errorDF : 0;
  const s = Math.sqrt(errorMS);

  const lackOfFitDF = Math.max(0, errorDF - pureErrorDF);
  const lackOfFitSS = Math.max(0, errorSS - pureErrorSS);
  const lackOfFitMS = lackOfFitDF > 0 ? lackOfFitSS / lackOfFitDF : 0;
  const pureErrorMS = pureErrorDF > 0 ? pureErrorSS / pureErrorDF : 0;
  const lackOfFitF = lackOfFitDF > 0 && pureErrorMS > 0 ? lackOfFitMS / pureErrorMS : null;
  const lackOfFitP = lackOfFitF !== null ? fPValue(lackOfFitF, lackOfFitDF, pureErrorDF) : null;

  const seCoef = errorDF > 0 && NFact > 0 ? s / Math.sqrt(NFact) : 0;
  const tCrit = errorDF > 0 ? tCriticalTwoSided(alpha, errorDF) : null;

  const termResults = rawTerms.map(t => {
    const contribution = totalSS > 0 ? (t.ss / totalSS) * 100 : 0;
    if (t.isPooled) {
      return {
        ...t,
        seCoef: null,
        tVal: null,
        fVal: null,
        pVal: null,
        significant: false,
        contribution: 0,
        rawContribution: contribution,
      };
    }
    const tVal = seCoef > 0 ? t.coef / seCoef : null;
    const fVal = errorMS > 0 ? t.ms / errorMS : null;
    const pVal = fVal !== null && errorDF > 0 ? fPValue(fVal, 1, errorDF) : null;
    const significant = pVal !== null ? pVal < alpha : false;
    return {
      ...t,
      seCoef,
      tVal,
      fVal,
      pVal,
      significant,
      contribution,
      rawContribution: contribution,
    };
  });

  // ANOVA grouped by order (Main, 2-way, 3-way, etc.)
  const orderGroups = [];
  for (let ord = 1; ord <= k; ord++) {
    const grp = activeTerms.filter(t => t.order === ord);
    if (grp.length > 0) {
      const ss = grp.reduce((sum, t) => sum + t.ss, 0);
      const df = grp.length;
      const ms = ss / df;
      const fVal = errorMS > 0 ? ms / errorMS : null;
      const pVal = fVal !== null && errorDF > 0 ? fPValue(fVal, df, errorDF) : null;
      orderGroups.push({
        order: ord,
        label: ord === 1 ? '주효과' : `${ord}차 교호작용`,
        df,
        ss,
        ms,
        fVal,
        pVal,
      });
    }
  }

  const r2 = totalSS > 0 ? (modelSS / totalSS) * 100 : 0;
  const totalMS = totalDF > 0 ? totalSS / totalDF : 0;
  const r2Adj = errorDF > 0 && totalMS > 0 ? Math.max(0, (1 - errorMS / totalMS) * 100) : 0;

  // Residuals & fitted values
  const observations = validRuns.map(r => {
    let yHat = factMean;
    activeTerms.forEach(t => {
      let sign = 1;
      t.indices.forEach(idx => {
        sign *= r.coded[factors[idx].symbol];
      });
      yHat += t.coef * sign;
    });
    const y = parseFloat(r.y);
    const resid = y - yHat;
    const stdResid = s > 0 ? resid / s : 0;
    return {
      ...r,
      y,
      yHat,
      resid,
      stdResid,
    };
  });

  // Uncoded regression coefficients (for numeric factors, categorical uses +/-1 indicator)
  const uncodedTerms = buildUncodedCoefficients(factors, factMean, activeTerms);

  return {
    N,
    NFact,
    grandMean,
    factMean,
    totalSS,
    totalDF,
    modelSS,
    modelDF,
    errorSS,
    errorDF,
    errorMS,
    pureErrorSS,
    pureErrorDF,
    pureErrorMS,
    lackOfFitSS,
    lackOfFitDF,
    lackOfFitMS,
    lackOfFitF,
    lackOfFitP,
    s,
    seCoef,
    tCrit,
    r2,
    r2Adj,
    errorContribution: totalSS > 0 ? (errorSS / totalSS) * 100 : 0,
    termResults,
    activeTerms: termResults.filter(t => !t.isPooled),
    pooledTerms: termResults.filter(t => t.isPooled),
    orderGroups,
    observations,
    uncoded: uncodedTerms,
  };
}

// Convert coded polynomial to uncoded polynomial by expanding x_i = (X_i - mid_i) / half_i
function buildUncodedCoefficients(factors, interceptCoded, activeTerms) {
  // Linear transform for each factor: x_i = a_i * X_i + b_i
  // For categorical: x_i stays coded (-1/+1)
  const transforms = factors.map(f => {
    if (f.type === 'categorical') {
      return { isCat: true, a: 1, b: 0, symbol: f.symbol, name: f.name };
    }
    const lo = parseFloat(f.lowVal);
    const hi = parseFloat(f.highVal);
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi === lo) {
      return { isCat: false, a: 1, b: 0, symbol: f.symbol, name: f.name };
    }
    const mid = (lo + hi) / 2;
    const half = (hi - lo) / 2;
    return { isCat: false, a: 1 / half, b: -mid / half, symbol: f.symbol, name: f.name };
  });

  const coeffMap = { __CONST__: interceptCoded };
  const addCoeff = (key, val) => {
    coeffMap[key] = (coeffMap[key] || 0) + val;
  };

  activeTerms.forEach(term => {
    const idxs = term.indices;
    // Expand product of (a_i * X_i + b_i) across i in idxs
    const m = idxs.length;
    for (let mask = 0; mask < (1 << m); mask++) {
      let prod = term.coef;
      const chosenSymbols = [];
      for (let bit = 0; bit < m; bit++) {
        const tf = transforms[idxs[bit]];
        if ((mask >> bit) & 1) {
          prod *= tf.a;
          chosenSymbols.push(tf.symbol);
        } else {
          prod *= tf.b;
        }
      }
      const key = chosenSymbols.length === 0 ? '__CONST__' : chosenSymbols.join('*');
      addCoeff(key, prod);
    }
  });

  return coeffMap;
}

export function predictFromModel(analysis, codedInputs) {
  if (!analysis) return 0;
  let yHat = analysis.factMean;
  analysis.activeTerms.forEach(t => {
    let prod = 1;
    t.indices.forEach(idx => {
      prod *= codedInputs[idx] ?? 0;
    });
    yHat += t.coef * prod;
  });
  return yHat;
}

export function predictionIntervals(analysis, codedInputs) {
  if (!analysis || analysis.errorDF <= 0) {
    const yHat = predictFromModel(analysis, codedInputs);
    return { yHat, seFit: 0, ciLow: yHat, ciHigh: yHat, piLow: yHat, piHigh: yHat };
  }
  const yHat = predictFromModel(analysis, codedInputs);
  // Orthogonal design: Var(yHat) = s^2 * (1/NFact + sum_{j in active} x_j^2 / NFact)
  let leverage = 1 / analysis.NFact;
  analysis.activeTerms.forEach(t => {
    let prod = 1;
    t.indices.forEach(idx => {
      prod *= codedInputs[idx] ?? 0;
    });
    leverage += (prod * prod) / analysis.NFact;
  });
  const seFit = analysis.s * Math.sqrt(leverage);
  const tCrit = tCriticalTwoSided(0.05, analysis.errorDF);
  const sePred = analysis.s * Math.sqrt(1 + leverage);
  return {
    yHat,
    seFit,
    ciLow: yHat - tCrit * seFit,
    ciHigh: yHat + tCrit * seFit,
    piLow: yHat - tCrit * sePred,
    piHigh: yHat + tCrit * sePred,
  };
}

// ==========================================
// 4. Response Optimizer
// ==========================================
export function optimizeResponse({
  factors,
  analysis,
  goal = 'target', // 'maximize' | 'minimize' | 'target'
  targetVal = 49,
  lowerBound = 40,
  upperBound = 60,
  weight = 1,
  fixedFactors = {}, // { [symbol]: { fixed: bool, codedVal: number, minCoded: number, maxCoded: number } }
}) {
  if (!analysis) return null;
  const k = factors.length;
  const step = k <= 3 ? 0.05 : 0.2;

  const axes = factors.map(f => {
    const cfg = fixedFactors[f.symbol] || {};
    if (cfg.fixed) return [cfg.codedVal ?? 0];
    if (f.type === 'categorical') return [-1, 1];
    const lo = cfg.minCoded ?? -1;
    const hi = cfg.maxCoded ?? 1;
    const arr = [];
    for (let x = lo; x <= hi + 1e-9; x += step) {
      arr.push(Math.round(x * 100) / 100);
    }
    return arr.length ? arr : [0];
  });

  const calcDesirability = y => {
    const w = Math.max(0.1, Number(weight) || 1);
    if (goal === 'maximize') {
      if (y <= lowerBound) return 0;
      if (y >= upperBound) return 1;
      return Math.pow((y - lowerBound) / Math.max(1e-9, upperBound - lowerBound), w);
    }
    if (goal === 'minimize') {
      if (y >= upperBound) return 0;
      if (y <= lowerBound) return 1;
      return Math.pow((upperBound - y) / Math.max(1e-9, upperBound - lowerBound), w);
    }
    // target
    if (y < lowerBound || y > upperBound) return 0;
    if (y <= targetVal) {
      return Math.pow((y - lowerBound) / Math.max(1e-9, targetVal - lowerBound), w);
    }
    return Math.pow((upperBound - y) / Math.max(1e-9, upperBound - targetVal), w);
  };

  let bestCoded = factors.map(() => 0);
  let bestY = predictFromModel(analysis, bestCoded);
  let bestScore = -Infinity;

  const search = (depth, current) => {
    if (depth === k) {
      const y = predictFromModel(analysis, current);
      const d = calcDesirability(y);
      let score = d;
      if (d === 0) {
        if (goal === 'target') score = -Math.abs(y - targetVal) - 1;
        else if (goal === 'maximize') score = y - 1e6;
        else score = -y - 1e6;
      } else if (goal === 'target') {
        score = d - Math.abs(y - targetVal) * 1e-5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestCoded = [...current];
        bestY = y;
      }
      return;
    }
    for (const v of axes[depth]) {
      current[depth] = v;
      search(depth + 1, current);
    }
  };
  search(0, new Array(k).fill(0));

  // Fine-tune numeric non-fixed factors around bestCoded
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < k; i++) {
      const f = factors[i];
      const cfg = fixedFactors[f.symbol] || {};
      if (cfg.fixed || f.type === 'categorical') continue;
      const lo = Math.max(cfg.minCoded ?? -1, bestCoded[i] - step);
      const hi = Math.min(cfg.maxCoded ?? 1, bestCoded[i] + step);
      for (let x = lo; x <= hi + 1e-9; x += 0.01) {
        const cand = [...bestCoded];
        cand[i] = Math.round(x * 100) / 100;
        const y = predictFromModel(analysis, cand);
        const d = calcDesirability(y);
        let score = d === 0
          ? (goal === 'target' ? -Math.abs(y - targetVal) - 1 : goal === 'maximize' ? y - 1e6 : -y - 1e6)
          : (goal === 'target' ? d - Math.abs(y - targetVal) * 1e-5 : d);
        if (score > bestScore) {
          bestScore = score;
          bestCoded = cand;
          bestY = y;
        }
      }
    }
  }

  return {
    coded: bestCoded,
    yHat: bestY,
    desirability: calcDesirability(bestY),
  };
}

// ==========================================
// 5. Confirmation & Hypothesis Testing (1-Sample t-test + AD Normality)
// ==========================================
export function andersonDarlingTest(values) {
  const n = values.length;
  if (n < 5) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  if (sd <= 0) return { n, ad: 0, pVal: 1 };

  let s = 0;
  for (let i = 0; i < n; i++) {
    const z1 = (sorted[i] - mean) / sd;
    const z2 = (sorted[n - 1 - i] - mean) / sd;
    const p1 = Math.max(1e-12, Math.min(1 - 1e-12, normCdf(z1)));
    const p2 = Math.max(1e-12, Math.min(1 - 1e-12, normCdf(z2)));
    s += (2 * (i + 1) - 1) * (Math.log(p1) + Math.log(1 - p2));
  }
  const ad = -n - s / n;
  const adStar = ad * (1 + 0.75 / n + 2.25 / (n * n));
  let pVal = 1;
  if (adStar >= 0.6) pVal = Math.exp(1.2937 - 5.709 * adStar + 0.0186 * adStar * adStar);
  else if (adStar >= 0.34) pVal = Math.exp(0.9177 - 4.279 * adStar - 1.38 * adStar * adStar);
  else if (adStar >= 0.2) pVal = 1 - Math.exp(-8.318 + 42.796 * adStar - 59.938 * adStar * adStar);
  else pVal = 1 - Math.exp(-13.436 + 101.14 * adStar - 223.73 * adStar * adStar);

  return { n, ad: adStar, pVal: Math.max(0.0001, Math.min(0.9999, pVal)), mean, sd };
}

export function oneSampleTTest({ values, mu0, alternative = 'two-sided', alpha = 0.05 }) {
  const n = values.length;
  if (n < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  const se = sd / Math.sqrt(n);
  const df = n - 1;
  const tStat = se > 0 ? (mean - mu0) / se : 0;
  const pTwo = tPValueTwoSided(Math.abs(tStat), df);
  let pVal = pTwo;
  if (alternative === 'greater') {
    pVal = tStat >= 0 ? pTwo / 2 : 1 - pTwo / 2;
  } else if (alternative === 'less') {
    pVal = tStat <= 0 ? pTwo / 2 : 1 - pTwo / 2;
  }
  const tCrit = tCriticalTwoSided(0.05, df);
  const ciLow = mean - tCrit * se;
  const ciHigh = mean + tCrit * se;
  const sorted = [...values].sort((a, b) => a - b);
  const q = p => {
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    n,
    mean,
    sd,
    se,
    df,
    mu0,
    tStat,
    pVal,
    rejectH0: pVal < alpha,
    ciLow,
    ciHigh,
    min: sorted[0],
    q1: q(0.25),
    median: q(0.5),
    q3: q(0.75),
    max: sorted[n - 1],
  };
}

// Data-driven residual diagnostics (Normality AD, Homoscedasticity variance ratio, Independence lag-1 r)
export function analyzeResidualsDiagnostics(observations) {
  if (!observations || observations.length < 4) return null;
  const resids = observations.map(o => o.resid);
  const n = resids.length;
  const maxStd = Math.max(...observations.map(o => Math.abs(o.stdResid)));
  const ad = andersonDarlingTest(resids);

  // Homoscedasticity: compare variance of residuals in lower half vs upper half of fitted values
  const byFit = [...observations].sort((a, b) => a.yHat - b.yHat);
  const half = Math.floor(n / 2);
  const varHalf = arr => {
    if (arr.length < 2) return 0;
    const m = arr.reduce((s, o) => s + o.resid, 0) / arr.length;
    return arr.reduce((s, o) => s + (o.resid - m) ** 2, 0) / (arr.length - 1);
  };
  const v1 = varHalf(byFit.slice(0, half));
  const v2 = varHalf(byFit.slice(half));
  const varRatio = Math.min(v1, v2) > 1e-9 ? Math.max(v1, v2) / Math.min(v1, v2) : 1;

  // Independence: lag-1 autocorrelation along run order
  const byOrder = [...observations].sort((a, b) => a.runOrder - b.runOrder).map(o => o.resid);
  const meanR = byOrder.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    den += (byOrder[i] - meanR) ** 2;
    if (i > 0) num += (byOrder[i] - meanR) * (byOrder[i - 1] - meanR);
  }
  const lag1 = den > 1e-9 ? num / den : 0;

  const normalOk = ad ? ad.pVal >= 0.05 : true;
  const homoOk = varRatio < 4.0;
  const indepOk = Math.abs(lag1) < 0.5;
  const outlierOk = maxStd < 3.0;

  return {
    n,
    maxStd,
    ad,
    varRatio,
    lag1,
    normalOk,
    homoOk,
    indepOk,
    outlierOk,
    allOk: normalOk && homoOk && indepOk && outlierOk,
  };
}

// ==========================================
// 6. Preloaded Sample Projects (Matching Demo & Reference)
// ==========================================
export function createSampleFilmProject() {
  const factors = [
    { symbol: 'A', name: '온도', unit: '℃', type: 'numeric', lowVal: '140', highVal: '180', currentVal: '160' },
    { symbol: 'B', name: '압력', unit: 'bar', type: 'numeric', lowVal: '2', highVal: '6', currentVal: '4' },
    { symbol: 'C', name: '속도', unit: 'm/min', type: 'numeric', lowVal: '10', highVal: '30', currentVal: '20' },
  ];
  const yMap = {
    std_1: 38.2, std_2: 51.4, std_3: 44.6, std_4: 62.8,
    std_5: 35.1, std_6: 48.0, std_7: 41.2, std_8: 59.5,
    std_9: 39.0, std_10: 52.1, std_11: 45.3, std_12: 63.5,
    std_13: 34.8, std_14: 47.4, std_15: 40.9, std_16: 58.7,
  };
  const runs = generateDesignRuns({
    factors,
    replicates: 2,
    centerPoints: 0,
    seed: 1,
    randomize: false,
    existingY: yMap,
  });

  const confirmationValues = [
    49.2, 48.7, 49.5, 48.9, 49.1, 49.6, 48.4, 49.0, 49.3, 48.8,
    49.4, 48.6, 49.1, 49.7, 48.5, 49.0, 49.2, 48.9, 49.5, 48.8,
    49.3, 48.7, 49.1, 49.4, 48.6, 49.0, 49.2, 48.9, 49.1, 48.8,
  ];

  return {
    id: 'sample_film_49',
    name: '필름 접착강도 DOE 분석 결과(목표49)',
    tag: '기본 사례',
    revision: 1,
    updatedAt: new Date().toISOString(),
    design: {
      doeType: 'full_factorial',
      factorCount: 3,
      levels: 2,
      replicates: 2,
      centerPoints: 0,
      randomize: false,
      seed: 1,
      factors,
      responseName: '필름 접착강도',
      responseUnit: 'kgf',
    },
    runs,
    alpha: 0.05,
    pooledKeys: ['AC', 'BC', 'ABC'],
    poolingHistory: [
      { round: 1, term: 'ABC', pBefore: 0.88, dfBefore: 8, dfAfter: 9 },
      { round: 2, term: 'BC', pBefore: 0.72, dfBefore: 9, dfAfter: 10 },
      { round: 3, term: 'AC', pBefore: 0.61, dfBefore: 10, dfAfter: 11 },
    ],
    optimizer: {
      goal: 'target',
      targetVal: 49,
      lowerBound: 44,
      upperBound: 54,
      weight: 1,
      fixedFactors: {},
      selectedCoded: [0, 0.25, 0],
    },
    confirmation: {
      count: 30,
      values: confirmationValues,
      alternative: 'two-sided',
      alpha: 0.05,
    },
    report: {
      title: '필름 접착강도 2³ 요인실험(DOE) 분석 보고서',
      author: 'DOE LAB 연구원',
      date: new Date().toISOString().slice(0, 10),
    },
  };
}

export function createDefaultBlankProject() {
  const factors = [
    { symbol: 'A', name: 'Temp', unit: '°C', type: 'numeric', lowVal: '160', highVal: '180', currentVal: '170' },
    { symbol: 'B', name: 'Gas', unit: '-', type: 'categorical', lowVal: 'N2', highVal: 'O2', currentVal: 'N2' },
    { symbol: 'C', name: 'Pre', unit: 'bar', type: 'numeric', lowVal: '5', highVal: '10', currentVal: '7.5' },
  ];
  const yMap = {
    std_1: 60, std_2: 72, std_3: 54, std_4: 68,
    std_5: 52, std_6: 83, std_7: 45, std_8: 80,
  };
  const runs = generateDesignRuns({
    factors,
    replicates: 1,
    centerPoints: 0,
    seed: 1,
    randomize: false,
    existingY: yMap,
  });

  return {
    id: `exp_${Date.now()}`,
    name: '2³ 기본 공정 수율 실험',
    tag: '신규 실험',
    revision: 1,
    updatedAt: new Date().toISOString(),
    design: {
      doeType: 'full_factorial',
      factorCount: 3,
      levels: 2,
      replicates: 1,
      centerPoints: 0,
      randomize: false,
      seed: 1,
      factors,
      responseName: '반응 수율',
      responseUnit: '%',
    },
    runs,
    alpha: 0.05,
    pooledKeys: ['AB', 'BC', 'ABC'],
    poolingHistory: [],
    optimizer: {
      goal: 'target',
      targetVal: 75,
      lowerBound: 50,
      upperBound: 90,
      weight: 1,
      fixedFactors: {},
      selectedCoded: [0.5, 1, 0.5],
    },
    confirmation: {
      count: 10,
      values: [74.8, 75.2, 74.5, 75.1, 74.9, 75.4, 74.7, 75.0, 75.3, 74.6],
      alternative: 'two-sided',
      alpha: 0.05,
    },
    report: {
      title: '2³ 요인실험(DOE) 공정 최적화 보고서',
      author: '공정엔지니어',
      date: new Date().toISOString().slice(0, 10),
    },
  };
}
