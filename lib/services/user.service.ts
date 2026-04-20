import { prisma } from '@/lib/db';
import type { Specialization, Role, User } from '@prisma/client';

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  primary_email_address_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

function getPrimaryEmail(data: ClerkUserData): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  );
  return primary?.email_address ?? data.email_addresses[0]?.email_address ?? '';
}

function getFullName(data: ClerkUserData): string {
  const parts = [data.first_name, data.last_name].filter(Boolean);
  return parts.join(' ') || 'Sin nombre';
}

export const userService = {
  async syncFromClerk(data: ClerkUserData): Promise<User> {
    const email = getPrimaryEmail(data);
    const name = getFullName(data);

    return prisma.user.upsert({
      where: { clerkUserId: data.id },
      create: {
        clerkUserId: data.id,
        email,
        name,
        imageUrl: data.image_url,
      },
      update: {
        email,
        name,
        imageUrl: data.image_url,
      },
    });
  },

  /**
   * Soft-delete: no eliminamos el registro para preservar el historial de reportes.
   * El prefijo DELETED_ invalida el clerkUserId y evita que el usuario se autentique.
   */
  async softDeleteByClerkId(clerkUserId: string): Promise<void> {
    await prisma.user.updateMany({
      where: { clerkUserId },
      data: { clerkUserId: `DELETED_${clerkUserId}` },
    });
  },

  async findByClerkId(clerkUserId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { clerkUserId } });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findAll(): Promise<User[]> {
    return prisma.user.findMany({ orderBy: { name: 'asc' } });
  },

  async updateSpecialization(id: string, specialization: Specialization): Promise<User> {
    return prisma.user.update({ where: { id }, data: { specialization } });
  },

  async updateRole(id: string, role: Role): Promise<User> {
    return prisma.user.update({ where: { id }, data: { role } });
  },
};
