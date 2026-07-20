import { V2_SERVICES } from '../lib/v2/services.js';
import {
  V2_BRAND,
  V2_HERO,
  V2_STATEMENT,
  V2_MARQUEE,
  V2_CTA,
} from '../lib/v2/site-content.js';

const payload = { V2_BRAND, V2_SERVICES, V2_HERO, V2_STATEMENT, V2_MARQUEE, V2_CTA };
const text = JSON.stringify(payload);
const forbiddenClaim =
  /(?:\+?\d+(?:\.\d+)?%|\d+\+\s*(?:clients|projects|hours)|\d(?:\.\d)?\/5)/i;

if (V2_SERVICES.length !== 5) {
  throw new Error('V2 must expose exactly five services.');
}

if (!V2_SERVICES.some((service) => service.id === 'ai-automation')) {
  throw new Error('AI Automation is missing.');
}

if (!V2_SERVICES.some((service) => service.id === 'workflow-automation')) {
  throw new Error('Workflow Automation is missing.');
}

if (new Set(V2_SERVICES.map((service) => service.id)).size !== 5) {
  throw new Error('Service IDs must be unique.');
}

for (const service of V2_SERVICES) {
  if (service.deliverables.length !== 3) {
    throw new Error(`${service.id} must expose exactly three deliverables.`);
  }

  if (!service.title || !service.value || !service.outcome) {
    throw new Error(`${service.id} is missing required content.`);
  }
}

if (V2_BRAND.displayName !== 'Crystal Web Solutions') {
  throw new Error('The v2 display brand must be Crystal Web Solutions.');
}

if (forbiddenClaim.test(text)) {
  throw new Error('Unverified numeric marketing claim detected.');
}

console.log('V2 content validation passed.');
