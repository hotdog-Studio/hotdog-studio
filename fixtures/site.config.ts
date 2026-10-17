import { defineSiteConfig } from '../src/lib/site-config-schema';

// The site config of the fixture build. The e2e tests assert these exact values.
export default defineSiteConfig({
  name: 'Thomas Southcott',
  jobTitle: 'Fixture QA Engineer',
  tagline: 'Fixture tagline: I build test automation.',
  pitch: 'Fixture pitch sentence one. Fixture pitch sentence two.',
  email: 'hello@example.com',
  links: {
    github: 'https://github.com/thomassouthcott',
    linkedin: 'https://www.linkedin.com/in/fixture',
    reelRaffle: 'https://reelraffle.org',
  },
  cv: '/cv/thomas-southcott-cv.pdf',
  openToWork: { enabled: true, message: 'Fixture: open to QA automation roles.' },
});
