import { describe, expect, it } from 'vitest';
import {
  defineSiteConfig,
  siteConfigSchema,
  type SiteConfig,
} from '../../src/lib/site-config-schema';

const valid: SiteConfig = {
  name: 'Thomas Southcott',
  jobTitle: 'QA Automation Engineer',
  tagline: 'I build test automation that teams can trust.',
  pitch: 'Two or three sentences about the work.',
  email: 'hello@example.com',
  links: {
    github: 'https://github.com/thomassouthcott',
    linkedin: 'https://www.linkedin.com/in/example',
    reelRaffle: 'https://reelraffle.org',
  },
  cv: '/cv/thomas-southcott-cv.pdf',
  openToWork: { enabled: true, message: 'Open to QA automation roles.' },
};

describe('defineSiteConfig', () => {
  it('returns a valid config', () => {
    expect(defineSiteConfig(valid)).toEqual(valid);
  });
  it('rejects an invalid email', () => {
    expect(() => defineSiteConfig({ ...valid, email: 'nope' })).toThrow(/email/);
  });
  it('rejects a non-web LinkedIn link', () => {
    expect(() =>
      defineSiteConfig({ ...valid, links: { ...valid.links, linkedin: 'javascript:alert(1)' } }),
    ).toThrow(/linkedin/);
  });
  it('requires an open-to-work message while it is enabled', () => {
    expect(() =>
      defineSiteConfig({ ...valid, openToWork: { enabled: true, message: '' } }),
    ).toThrow(/openToWork\.message|message/);
  });
  it('allows an empty open-to-work message while it is disabled', () => {
    expect(
      defineSiteConfig({ ...valid, openToWork: { enabled: false, message: '' } }).openToWork,
    ).toEqual({ enabled: false, message: '' });
  });
  it('rejects a cv path that is not root-relative', () => {
    expect(() => defineSiteConfig({ ...valid, cv: 'cv.pdf' })).toThrow(/cv/);
  });
  it('opens its error with a heading', () => {
    expect(() => defineSiteConfig({ ...valid, email: 'nope' })).toThrow(/^Invalid site config:\n/);
  });
});

describe('siteConfigSchema: issue paths', () => {
  const issuePaths = (config: object) =>
    siteConfigSchema.safeParse(config).error?.issues.map((i) => i.path.join('.')) ?? [];

  it.each(['name', 'jobTitle', 'tagline', 'pitch'])('rejects an empty %s', (field) => {
    expect(issuePaths({ ...valid, [field]: '' })).toEqual([field]);
  });
  it.each([
    ['email', 'nope'],
    ['cv', 'cv.pdf'],
  ])('rejects %s of %j', (field, value) => {
    expect(issuePaths({ ...valid, [field]: value })).toEqual([field]);
  });
  it.each(['github', 'linkedin', 'reelRaffle'])('rejects a non-web links.%s', (link) => {
    expect(
      issuePaths({ ...valid, links: { ...valid.links, [link]: 'mailto:me@example.com' } }),
    ).toEqual([`links.${link}`]);
  });
  it('names openToWork.message when it is enabled without one', () => {
    expect(issuePaths({ ...valid, openToWork: { enabled: true, message: '' } })).toEqual([
      'openToWork.message',
    ]);
  });
});
