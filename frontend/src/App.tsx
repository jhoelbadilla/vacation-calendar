import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Moon, Plus, Settings, Sun, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthScreen } from "./components/auth/AuthScreen";
import { CalendarGrid } from "./components/calendar/CalendarGrid";
import { DateEditor } from "./components/calendar/DateEditor";
import { CreateProfileModal } from "./components/profile/CreateProfileModal";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { buildCalendarTimeline, flattenMonths } from "./features/calculations/vacation";
import { api } from "./lib/api";
import type { Profile, User, YearPayload } from "./types/api";

export function App() {
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 2;
  const [year, setYear] = useState(currentYear);
  const [visibleMonth, setVisibleMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [multiDaySelectionEnabled, setMultiDaySelectionEnabled] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("vaccal-theme") === "dark");
  const [profileDeleteTarget, setProfileDeleteTarget] = useState<Profile | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("vaccal-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: User }>("/me"),
    retry: false
  });

  const profiles = useQuery({
    queryKey: ["profiles"],
    queryFn: () => api<{ profiles: Profile[] }>("/profiles"),
    enabled: Boolean(me.data?.user)
  });

  const profileList = profiles.data?.profiles ?? [];
  const activeProfile = profileList.find((profile) => profile.id === activeProfileId) ?? profileList[0];

  const yearData = useQuery({
    queryKey: ["year", activeProfile?.id, year],
    queryFn: () => api<YearPayload>(`/profiles/${activeProfile!.id}/year/${year}`),
    enabled: Boolean(activeProfile?.id)
  });

  const settings = yearData.data?.settings;
  const projectionStartYear = settings ? new Date(`${settings.currentVacationAsOfDate}T00:00:00Z`).getUTCFullYear() : year;
  const projectionEndYear = Math.min(Math.max(currentYear, year), maxYear);
  const projectionYears = useMemo(() => {
    if (!settings) return [];
    const start = Math.min(projectionStartYear, projectionEndYear);
    return Array.from({ length: projectionEndYear - start + 1 }, (_, index) => start + index);
  }, [projectionEndYear, projectionStartYear, settings]);

  const projectionQueries = useQueries({
    queries: projectionYears.map((projectionYear) => ({
      queryKey: ["year", activeProfile?.id, projectionYear],
      queryFn: () => api<YearPayload>(`/profiles/${activeProfile!.id}/year/${projectionYear}`),
      enabled: Boolean(activeProfile?.id && settings)
    }))
  });

  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
    }
  });

  const deleteProfile = useMutation({
    mutationFn: (profileId: string) => api(`/profiles/${profileId}`, { method: "DELETE" }),
    onSuccess: async () => {
      setActiveProfileId(null);
      setSelectedDate(null);
      setProfileDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
    }
  });

  function confirmDeleteProfile() {
    if (profileDeleteTarget) deleteProfile.mutate(profileDeleteTarget.id);
  }

  const timelineMonths = useMemo(() => {
    if (!settings || projectionYears.length === 0) return [];
    const payloads = projectionQueries.map((query) => query.data).filter((payload): payload is YearPayload => Boolean(payload));
    if (payloads.length !== projectionYears.length) return [];
    const overrides = payloads.flatMap((payload) => payload.overrides);
    return buildCalendarTimeline(projectionYears[0], projectionYears[projectionYears.length - 1], settings, overrides);
  }, [projectionQueries, projectionYears, settings]);

  const months = useMemo(() => timelineMonths.filter((month) => month.year === year), [timelineMonths, year]);
  const currentYearMonths = useMemo(() => timelineMonths.filter((month) => month.year === currentYear), [currentYear, timelineMonths]);

  const days = useMemo(() => flattenMonths(months), [months]);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const selectedDays = useMemo(() => {
    if (!rangeStart || !rangeEnd) return selectedDay ? [selectedDay] : [];
    return days.filter((day) => day.date >= rangeStart && day.date <= rangeEnd && day.isSelectable);
  }, [days, rangeEnd, rangeStart, selectedDay]);
  const today = new Date().toISOString().slice(0, 10);
  const currentYearDays = useMemo(() => flattenMonths(currentYearMonths), [currentYearMonths]);
  const todayDay = currentYearDays.find((day) => day.date === today);
  const metrics = useMemo(() => {
    const standardWorkdayHours = settings?.standardWorkdayHours ?? 7.5;
    const toDays = (hours: number) => (standardWorkdayHours > 0 ? hours / standardWorkdayHours : 0);
    const usedHours = currentYearDays
      .filter((day) => day.vacationDay && day.date <= today)
      .reduce((total, day) => total + day.vacationHours, 0);
    const plannedHours = currentYearDays
      .filter((day) => day.vacationDay && day.date > today)
      .reduce((total, day) => total + day.vacationHours, 0);

    return {
      balance: todayDay?.runningVacationBalanceHours === null || todayDay?.runningVacationBalanceHours === undefined ? null : toDays(todayDay.runningVacationBalanceHours),
      used: toDays(usedHours),
      planned: toDays(plannedHours)
    };
  }, [currentYearDays, settings?.standardWorkdayHours, today, todayDay?.runningVacationBalanceHours]);

  if (me.isLoading) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading workspace...</main>;
  }

  if (!me.data?.user) {
    return <AuthScreen />;
  }

  const noProfiles = profiles.isSuccess && profileList.length === 0;
  const calendarLoading = profiles.isLoading || yearData.isLoading || projectionQueries.some((query) => query.isLoading || query.isFetching);

  function selectCalendarDay(day: (typeof days)[number]) {
    setSelectedDate(day.date);

    if (!multiDaySelectionEnabled) {
      setRangeStart(day.date);
      setRangeEnd(day.date);
      return;
    }

    if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
      setRangeStart(day.date);
      setRangeEnd(day.date);
      return;
    }

    if (day.date === rangeStart) {
      setRangeEnd(day.date);
      return;
    }

    setRangeStart(day.date < rangeStart ? day.date : rangeStart);
    setRangeEnd(day.date > rangeStart ? day.date : rangeStart);
  }

  function clearRange() {
    setRangeStart(selectedDate);
    setRangeEnd(selectedDate);
  }

  function toggleMultiDaySelection(enabled: boolean) {
    setMultiDaySelectionEnabled(enabled);
    setRangeStart(selectedDate);
    setRangeEnd(selectedDate);
  }

  function changeYear(nextYear: number) {
    setYear(Math.min(nextYear, maxYear));
  }

  const metricCards = [
    {
      label: "Vacation Balance Today",
      shortLabel: "Balance",
      value: metrics.balance === null ? "-" : metrics.balance.toFixed(2),
      tone: "border-emerald-300/70 bg-emerald-50 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-50"
    },
    {
      label: "Used Vacation This Year",
      shortLabel: "Used",
      value: metrics.used.toFixed(2),
      tone: "border-orange-300/70 bg-orange-50 text-orange-950 dark:border-orange-400/30 dark:bg-orange-400/15 dark:text-orange-50"
    },
    {
      label: "Planned Vacation Time This Year",
      shortLabel: "Planned",
      value: metrics.planned.toFixed(2),
      tone: "border-fuchsia-300/70 bg-fuchsia-50 text-fuchsia-950 dark:border-fuchsia-400/30 dark:bg-fuchsia-400/15 dark:text-fuchsia-50"
    }
  ];

  return (
    <main className="min-h-screen px-3 py-4 md:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/90 px-4 py-3 shadow-sm backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vacation Calendar</p>
          <h1 className="text-lg font-semibold">{activeProfile?.name ?? "No profile yet"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profileList.length ? (
            <select
              className="h-10 rounded-md border border-border bg-card px-3 text-sm"
              value={activeProfile?.id}
              onChange={(event) => setActiveProfileId(event.currentTarget.value)}
            >
              {profileList.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          ) : null}
          <button title="Create profile" className="rounded-md border border-border p-2" onClick={() => setShowCreateProfile(true)}>
            <Plus size={18} />
          </button>
          {activeProfile ? (
            <button
              title="Simulation settings"
              className="rounded-md border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground lg:hidden"
              onClick={() => setShowMobileSettings(true)}
            >
              <Settings size={18} />
            </button>
          ) : null}
          <button
            title={darkMode ? "Use light mode" : "Use dark mode"}
            className="rounded-md border border-border p-2 transition hover:bg-muted"
            onClick={() => setDarkMode((current) => !current)}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {activeProfile ? (
            <button
              title="Delete profile"
              className="rounded-md border border-border p-2 text-muted-foreground hover:text-destructive"
              onClick={() => setProfileDeleteTarget(activeProfile)}
              disabled={deleteProfile.isPending}
            >
              <Trash2 size={18} />
            </button>
          ) : null}
          <button title="Log out" className="rounded-md border border-border p-2" onClick={() => logout.mutate()}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className={noProfiles ? "pointer-events-none grayscale opacity-50" : ""}>
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)_18rem]">
          <aside className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:content-start lg:gap-4">
            {metricCards.map((metric) => (
              <section key={metric.label} className={`rounded-lg border p-3 shadow-sm transition lg:p-4 ${metric.tone}`}>
                <h2 className="hidden text-sm font-semibold uppercase tracking-wide lg:block">{metric.label}</h2>
                <h2 className="text-xs font-semibold uppercase tracking-wide lg:hidden">{metric.shortLabel}</h2>
                <p className="mt-2 text-xl font-semibold lg:mt-3 lg:text-3xl">{metric.value}</p>
                <p className="mt-1 text-[0.68rem] font-medium opacity-75 lg:text-xs">days</p>
              </section>
            ))}
          </aside>

          {yearData.data && months.length ? (
            <CalendarGrid
              year={year}
              maxYear={maxYear}
              visibleMonth={visibleMonth}
              months={months}
              selectedDate={selectedDate}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              multiDaySelectionEnabled={multiDaySelectionEnabled}
              onMultiDaySelectionChange={toggleMultiDaySelection}
              onMonthChange={setVisibleMonth}
              onSelect={selectCalendarDay}
              onYearChange={changeYear}
            />
          ) : (
            <section className="grid min-h-96 place-items-center rounded-lg border border-border bg-card/90 text-sm text-muted-foreground">
              {calendarLoading ? "Loading calendar..." : "Create a profile to start simulating."}
            </section>
          )}

          <div className="grid content-start gap-4">
            {yearData.data ? (
              <div className="hidden lg:block">
                <SettingsPanel profileId={yearData.data.profile.id} settings={yearData.data.settings} />
              </div>
            ) : null}
            {activeProfile && yearData.data ? (
              <DateEditor
                profileId={activeProfile.id}
                day={selectedDay}
                selectedDays={selectedDays}
                standardWorkdayHours={yearData.data.settings.standardWorkdayHours}
                onClearRange={clearRange}
              />
            ) : null}
          </div>
        </div>
      </div>

      {noProfiles ? (
        <CreateProfileModal
          required
          onCreated={(profile) => {
            setActiveProfileId(profile.id);
          }}
        />
      ) : null}
      {showCreateProfile ? (
        <CreateProfileModal
          required={false}
          onCancel={() => setShowCreateProfile(false)}
          onCreated={(profile) => {
            setActiveProfileId(profile.id);
            setShowCreateProfile(false);
          }}
        />
      ) : null}
      {profileDeleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-panel">
            <h2 className="text-xl font-semibold">Delete simulation profile?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This will delete "{profileDeleteTarget.name}" and remove its settings and calendar overrides.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="h-10 rounded-md border border-border px-4 text-sm font-semibold"
                onClick={() => setProfileDeleteTarget(null)}
                disabled={deleteProfile.isPending}
              >
                Cancel
              </button>
              <button
                className="h-10 rounded-md bg-destructive px-4 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                onClick={confirmDeleteProfile}
                disabled={deleteProfile.isPending}
              >
                {deleteProfile.isPending ? "Deleting..." : "Delete profile"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {showMobileSettings && yearData.data ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-3 backdrop-blur-sm lg:hidden">
          <div className="w-full max-w-md">
            <SettingsPanel
              profileId={yearData.data.profile.id}
              settings={yearData.data.settings}
              onClose={() => setShowMobileSettings(false)}
              closeAfterSave
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}
