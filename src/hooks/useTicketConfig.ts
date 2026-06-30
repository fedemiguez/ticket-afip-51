"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasCustomLocalConfig,
  loadLocalTicketConfig,
  markLocalConfigImported,
  saveLocalTicketConfig,
  wasLocalConfigImported,
} from "@/lib/ticket-config-storage";
import {
  dataUrlToFile,
  isDefaultProfile,
  profileResponseToTicketConfig,
  ticketConfigToProfileBody,
} from "@/lib/ticket-config";
import {
  DEFAULT_TICKET_CONFIG,
  type ProfileResponse,
  type TicketConfig,
} from "@/lib/types";

const SAVE_DEBOUNCE_MS = 600;

export function useTicketConfig() {
  const { isSignedIn, isLoaded } = useAuth();
  const [config, setConfig] = useState<TicketConfig>(DEFAULT_TICKET_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImportPrompt, setShowImportPrompt] = useState(false);

  const skipSaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDoneRef = useRef(false);

  const applyConfig = useCallback((next: TicketConfig) => {
    skipSaveRef.current = true;
    setConfig(next);
  }, []);

  const loadFromApi = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v2/profile");
      const data = (await response.json()) as ProfileResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el perfil");
      }

      applyConfig(profileResponseToTicketConfig(data));

      const shouldOfferImport =
        !wasLocalConfigImported() &&
        hasCustomLocalConfig() &&
        isDefaultProfile(data);

      setShowImportPrompt(shouldOfferImport);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Error al cargar el perfil",
      );
      const local = loadLocalTicketConfig();
      if (local) {
        applyConfig(local);
      }
    } finally {
      setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [applyConfig]);

  const persistProfile = useCallback(async (next: TicketConfig) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/v2/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketConfigToProfileBody(next)),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el perfil");
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Error al guardar el perfil",
      );
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    initialLoadDoneRef.current = false;
    skipSaveRef.current = true;

    if (isSignedIn) {
      void loadFromApi();
      return;
    }

    const local = loadLocalTicketConfig();
    applyConfig(local ?? DEFAULT_TICKET_CONFIG);
    setShowImportPrompt(false);
    initialLoadDoneRef.current = true;
  }, [isLoaded, isSignedIn, loadFromApi, applyConfig]);

  useEffect(() => {
    if (!isLoaded || !initialLoadDoneRef.current) return;

    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    if (isSignedIn) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        void persistProfile(config);
      }, SAVE_DEBOUNCE_MS);

      return () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
      };
    }

    saveLocalTicketConfig(config);
  }, [config, isLoaded, isSignedIn, persistProfile]);

  const handleConfigChange = useCallback((next: TicketConfig) => {
    setConfig(next);
  }, []);

  const uploadLogo = useCallback(
    async (file: File) => {
      if (!isSignedIn) {
        const reader = new FileReader();
        reader.onload = () => {
          setConfig((current) => ({
            ...current,
            logoDataUrl: reader.result as string,
          }));
        };
        reader.readAsDataURL(file);
        return;
      }

      setLogoUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/v2/profile/logo", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as ProfileResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo subir el logo");
        }

        applyConfig(profileResponseToTicketConfig(data));
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Error al subir el logo",
        );
      } finally {
        setLogoUploading(false);
      }
    },
    [applyConfig, isSignedIn],
  );

  const deleteLogo = useCallback(async () => {
    if (!isSignedIn) {
      setConfig((current) => ({ ...current, logoDataUrl: null }));
      return;
    }

    setLogoUploading(true);
    setError(null);

    try {
      const response = await fetch("/api/v2/profile/logo", {
        method: "DELETE",
      });

      const data = (await response.json()) as ProfileResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el logo");
      }

      applyConfig(profileResponseToTicketConfig(data));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Error al eliminar el logo",
      );
    } finally {
      setLogoUploading(false);
    }
  }, [applyConfig, isSignedIn]);

  const importLocalConfig = useCallback(async () => {
    const local = loadLocalTicketConfig();
    if (!local) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/v2/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketConfigToProfileBody(local)),
      });

      const data = (await response.json()) as ProfileResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo importar la configuración");
      }

      let nextConfig = profileResponseToTicketConfig(data);

      if (local.logoDataUrl?.startsWith("data:")) {
        const logoFile = dataUrlToFile(local.logoDataUrl);
        const formData = new FormData();
        formData.append("file", logoFile);

        const logoResponse = await fetch("/api/v2/profile/logo", {
          method: "POST",
          body: formData,
        });

        const logoData = (await logoResponse.json()) as ProfileResponse & {
          error?: string;
        };

        if (logoResponse.ok) {
          nextConfig = profileResponseToTicketConfig(logoData);
        }
      }

      applyConfig(nextConfig);
      markLocalConfigImported();
      setShowImportPrompt(false);
    } catch (importError) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Error al importar la configuración",
      );
    } finally {
      setSaving(false);
    }
  }, [applyConfig]);

  const dismissImportPrompt = useCallback(() => {
    markLocalConfigImported();
    setShowImportPrompt(false);
  }, []);

  return {
    config,
    onConfigChange: handleConfigChange,
    loading,
    saving,
    logoUploading,
    error,
    showImportPrompt,
    importLocalConfig,
    dismissImportPrompt,
    uploadLogo,
    deleteLogo,
    isPersisted: Boolean(isLoaded && isSignedIn),
  };
}
