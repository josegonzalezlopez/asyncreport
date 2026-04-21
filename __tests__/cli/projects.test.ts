import { describe, it, expect, vi } from 'vitest';
import {
  shortId,
  sortProjects,
  resolveProjectRef,
  fetchMyProjects,
  formatProjectConfirm,
  formatChoiceLabel,
  type CliProject,
} from '../../cli/utils/projects';

const P: CliProject[] = [
  { id: 'id-infra', name: 'Infraestructura', code: 'ASYNC-INFRA' },
  { id: 'id-web', name: 'AsyncReport Web', code: 'ASYNC-WEB' },
  { id: 'id-api', name: 'AsyncReport API', code: 'ASYNC-API' },
];

describe('cli/utils/projects', () => {
  describe('shortId', () => {
    it('no trunca si cabe', () => {
      expect(shortId('abc', 10)).toBe('abc');
    });
    it('trunca con elipsis', () => {
      expect(shortId('0123456789abcdef', 10)).toBe('0123456789…');
    });
  });

  describe('sortProjects', () => {
    it('ordena por código y luego nombre', () => {
      const shuffled = [...P].reverse();
      shuffled.sort(sortProjects);
      expect(shuffled.map((x) => x.code)).toEqual(['ASYNC-API', 'ASYNC-INFRA', 'ASYNC-WEB']);
    });

    it('proyectos sin código van al final (por orden de nombre)', () => {
      const list: CliProject[] = [
        { id: 'a', name: 'Zeta', code: null },
        { id: 'b', name: 'Alpha', code: 'ZZZ' },
      ];
      list.sort(sortProjects);
      expect(list.map((x) => x.id)).toEqual(['b', 'a']);
    });
  });

  describe('resolveProjectRef', () => {
    it('resuelve por id exacto', () => {
      expect(resolveProjectRef(P, 'id-web')?.code).toBe('ASYNC-WEB');
    });

    it('resuelve por código case-insensitive', () => {
      expect(resolveProjectRef(P, 'async-web')?.id).toBe('id-web');
    });

    it('retorna null si está vacío', () => {
      expect(resolveProjectRef(P, '   ')).toBeNull();
    });

    it('retorna null si no existe', () => {
      expect(resolveProjectRef(P, 'NOPE')).toBeNull();
    });

    it('retorna null si hay más de un proyecto con el mismo código (ambiguo)', () => {
      const dup: CliProject[] = [
        { id: '1', name: 'A', code: 'SAME' },
        { id: '2', name: 'B', code: 'SAME' },
      ];
      expect(resolveProjectRef(dup, 'SAME')).toBeNull();
    });
  });

  describe('fetchMyProjects', () => {
    it('llama /api/projects/my y ordena', async () => {
      const client = {
        get: vi.fn().mockResolvedValue([P[1], P[0], P[2]]),
      };
      const out = await fetchMyProjects(client);
      expect(client.get).toHaveBeenCalledWith('/api/projects/my');
      expect(out.map((x) => x.code)).toEqual(['ASYNC-API', 'ASYNC-INFRA', 'ASYNC-WEB']);
    });
  });

  describe('formatProjectConfirm', () => {
    it('incluye código y nombre', () => {
      expect(formatProjectConfirm(P[0])).toBe('[ASYNC-INFRA] Infraestructura — id: id-infra');
    });
    it('sin código', () => {
      expect(
        formatProjectConfirm({ id: 'x', name: 'Solo', code: null }),
      ).toBe('Solo — id: x');
    });
  });

  describe('formatChoiceLabel', () => {
    it('incluye nombre y parte del id', () => {
      const line = formatChoiceLabel(P[0]);
      expect(line).toContain('Infraestructura');
      expect(line).toContain('id-infra'.slice(0, 10));
    });
  });
});
