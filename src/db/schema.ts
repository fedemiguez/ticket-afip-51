import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { AfipInvoiceData } from "@/lib/types";

export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  businessName: text("business_name").notNull().default("Mi Comercio"),
  subtitle: text("subtitle").notNull().default(""),
  address: text("address").notNull().default(""),
  phone: text("phone").notNull().default(""),
  footer: text("footer").notNull().default("Gracias por su compra"),
  paperWidthMm: integer("paper_width_mm").notNull().default(51),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const invoiceRecords = pgTable(
  "invoice_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    sourceFileName: text("source_file_name"),
    invoiceData: jsonb("invoice_data").$type<AfipInvoiceData>().notNull(),
    warnings: jsonb("warnings").$type<string[]>().notNull().default([]),
    qrUrl: text("qr_url"),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_invoice_records_user_processed").on(
      table.userId,
      table.processedAt,
    ),
  ],
);

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type NewBusinessProfile = typeof businessProfiles.$inferInsert;
export type InvoiceRecord = typeof invoiceRecords.$inferSelect;
export type NewInvoiceRecord = typeof invoiceRecords.$inferInsert;
