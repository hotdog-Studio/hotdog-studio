import { describe, expect, it } from 'vitest';
import OtherProjects from '../../../src/components/OtherProjects.astro';
import { renderHtml } from '../../support/render';

// Not the fixture projects, so a component that hard-codes them can't pass.
const projects = [
  {
    name: 'Tide Tracker',
    description: 'A command-line tide table for the east coast.',
    repo: 'https://github.com/example/tide-tracker',
  },
  {
    name: 'Plant Pal',
    description: 'Reminds you to water the ferns.',
    repo: 'https://github.com/example/plant-pal',
  },
];

describe('OtherProjects', () => {
  it('is a section labelled by its Other things I build heading', async () => {
    const doc = await renderHtml(OtherProjects, { projects });
    const section = doc.querySelector('section');
    const heading = section?.querySelector('h2');
    expect(heading?.textContent).toBe('Other things I build');
    expect(heading?.id).not.toBe('');
    expect(section?.getAttribute('aria-labelledby')).toBe(heading?.id);
  });

  it('links each project name to its repo, in the order given', async () => {
    const doc = await renderHtml(OtherProjects, { projects });
    const links = [...doc.querySelectorAll('section a')];
    expect(links.map((link) => link.textContent)).toEqual(['Tide Tracker', 'Plant Pal']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://github.com/example/tide-tracker',
      'https://github.com/example/plant-pal',
    ]);
  });

  it('lists each description with its own project', async () => {
    const doc = await renderHtml(OtherProjects, { projects });
    const items = [...doc.querySelectorAll('section li')];
    expect(items).toHaveLength(2);
    expect(items[0]?.querySelector('a')?.textContent).toBe('Tide Tracker');
    expect(items[0]?.textContent).toContain('A command-line tide table for the east coast.');
    expect(items[1]?.querySelector('a')?.textContent).toBe('Plant Pal');
    expect(items[1]?.textContent).toContain('Reminds you to water the ferns.');
  });

  it('renders nothing when there are no projects', async () => {
    const doc = await renderHtml(OtherProjects, { projects: [] });
    expect(doc.querySelector('section')).toBeNull();
    expect(doc.body.textContent.trim()).toBe('');
  });
});
