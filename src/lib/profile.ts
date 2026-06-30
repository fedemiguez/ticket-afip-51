import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businessProfiles, type BusinessProfile } from "@/db/schema";
import {
  DEFAULT_TICKET_CONFIG,
  type TicketConfig,
} from "@/lib/types";

export function profileToTicketConfig(
  profile: BusinessProfile,
): TicketConfig & { logoUrl: string | null } {
  return {
    businessName: profile.businessName,
    subtitle: profile.subtitle,
    address: profile.address,
    phone: profile.phone,
    footer: profile.footer,
    paperWidthMm: profile.paperWidthMm,
    logoDataUrl: profile.logoUrl,
    logoUrl: profile.logoUrl,
  };
}

export function ticketConfigToProfileValues(config: Partial<TicketConfig>) {
  return {
    businessName: config.businessName ?? DEFAULT_TICKET_CONFIG.businessName,
    subtitle: config.subtitle ?? DEFAULT_TICKET_CONFIG.subtitle,
    address: config.address ?? DEFAULT_TICKET_CONFIG.address,
    phone: config.phone ?? DEFAULT_TICKET_CONFIG.phone,
    footer: config.footer ?? DEFAULT_TICKET_CONFIG.footer,
    paperWidthMm: config.paperWidthMm ?? DEFAULT_TICKET_CONFIG.paperWidthMm,
  };
}

export async function getProfileByUserId(
  userId: string,
): Promise<BusinessProfile | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function upsertProfile(
  userId: string,
  values: Partial<TicketConfig> & { logoUrl?: string | null },
): Promise<BusinessProfile> {
  const db = getDb();
  const mapped = ticketConfigToProfileValues(values);
  const existing = await getProfileByUserId(userId);

  if (existing) {
    const [updated] = await db
      .update(businessProfiles)
      .set({
        ...mapped,
        logoUrl:
          values.logoUrl !== undefined ? values.logoUrl : existing.logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(businessProfiles.userId, userId))
      .returning();

    return updated;
  }

  const [created] = await db
    .insert(businessProfiles)
    .values({
      userId,
      ...mapped,
      logoUrl: values.logoUrl ?? null,
    })
    .returning();

  return created;
}

export async function updateProfileLogoUrl(
  userId: string,
  logoUrl: string | null,
): Promise<BusinessProfile> {
  return upsertProfile(userId, { logoUrl });
}
