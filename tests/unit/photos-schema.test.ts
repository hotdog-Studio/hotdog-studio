import { describe, expect, it } from 'vitest';
import { photoManifestSchema } from '../../src/lib/photos-schema';
import { makeAlbum, makePhoto } from '../support/photo-manifest';

const parse = (album: unknown) => photoManifestSchema.safeParse({ albums: [album] });

describe('photoManifestSchema', () => {
  it('accepts a valid album', () => {
    expect(parse(makeAlbum()).success).toBe(true);
  });

  it('accepts the EXIF fields in the spec', () => {
    const exif = {
      camera: 'Sony A7 III',
      lens: 'FE 35mm F1.8',
      focalLength: '35 mm',
      aperture: 'f/1.8',
      shutter: '1/250 s',
      iso: 100,
      takenOn: '2025-06-14',
    };
    expect(parse(makeAlbum({ photos: [makePhoto({ exif })] })).success).toBe(true);
  });

  it('rejects an EXIF field the spec does not list, such as gps', () => {
    const photo = { ...makePhoto(), exif: { gps: '0,0' } };
    expect(parse(makeAlbum({ photos: [photo as never] })).success).toBe(false);
  });

  it('rejects a photo field the spec does not list, such as filename', () => {
    const photo = { ...makePhoto(), filename: 'DSC1.jpg' };
    expect(parse(makeAlbum({ photos: [photo as never] })).success).toBe(false);
  });

  it('reports a coverId that is not in the album on coverId', () => {
    const result = parse(makeAlbum({ coverId: 'ffffffffff' }));
    expect(result.success).toBe(false);
    if (result.success) return;
    const paths = result.error.issues.map((issue) => issue.path.join('.'));
    expect(paths.some((path) => path.endsWith('coverId'))).toBe(true);
  });

  it('rejects an album with no photos', () => {
    expect(parse(makeAlbum({ photos: [] })).success).toBe(false);
  });

  it('rejects a dominant colour without the leading #', () => {
    const photo = makePhoto({ dominantColor: 'c89818' });
    expect(parse(makeAlbum({ photos: [photo] })).success).toBe(false);
  });

  it('rejects a source outside /photos', () => {
    const photo = makePhoto({
      sources: {
        avif: [{ w: 480, src: '/photos/test-album/0123456789-480.avif' }],
        webp: [{ w: 480, src: '/elsewhere/0123456789-480.webp' }],
      },
    });
    expect(parse(makeAlbum({ photos: [photo] })).success).toBe(false);
  });
});
