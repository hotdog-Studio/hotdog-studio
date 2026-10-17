import { defineSiteConfig } from './lib/site-config-schema';

export default defineSiteConfig({
  name: 'Thomas Southcott',
  // TODO(thomas): confirm this job title. It is used in the JSON-LD and the page metadata.
  jobTitle: 'QA Automation Engineer',
  // TODO(thomas): write the one-line tagline.
  tagline: 'TODO(thomas): one-line tagline',
  // TODO(thomas): write the pitch, two or three sentences.
  pitch: 'TODO(thomas): two or three sentences on what you do and what you are looking for',
  email: 'hello@hotdog.studio',
  links: {
    github: 'https://github.com/thomassouthcott',
    // TODO(thomas): replace the final TODO with your LinkedIn profile name.
    linkedin: 'https://www.linkedin.com/in/TODO',
    reelRaffle: 'https://reelraffle.org',
  },
  cv: '/cv/thomas-southcott-cv.pdf',
  // TODO(thomas): say which roles you want and where, or whether remote is fine.
  openToWork: { enabled: true, message: 'TODO(thomas): role types and location' },
});
