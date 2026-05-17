import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AuthScreen } from "./components/auth/AuthScreen";
import { CalendarGrid } from "./components/calendar/CalendarGrid";
import { DateEditor } from "./components/calendar/DateEditor";
import { CreateProfileModal } from "./components/profile/CreateProfileModal";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { buildYearCalendar, flattenMonths, formatHoursAndDays } from "./features/calculations/vacation";
import { api } from "./lib/api";
import type { Profile, User, YearPayload } from "./types/api";

export function App() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [multiDaySelectionEnabled, setMultiDaySelectionEnabled] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [profileDeleteTarget, setProfileDeleteTarget] = useState<Profile | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const months = useMemo(() => {
    if (!yearData.data) return [];
    return buildYearCalendar(year, yearData.data.settings, yearData.data.overrides);
  }, [year, yearData.data]);

  const days = useMemo(() => flattenMonths(months), [months]);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const selectedDays = useMemo(() => {
    if (!rangeStart || !rangeEnd) return selectedDay ? [selectedDay] : [];
    return days.filter((day) => day.date >= rangeStart && day.date <= rangeEnd && day.isSelectable);
  }, [days, rangeEnd, rangeStart, selectedDay]);
  const today = new Date().toISOString().slice(0, 10);
  const todayDay = days.find((day) => day.date === today);
  const endOfYearDay = days.at(-1);

  if (me.isLoading) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading workspace...</main>;
  }

  if (!me.data?.user) {
    return <AuthScreen />;
  }

  const noProfiles = profiles.isSuccess && profileList.length === 0;

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

  return (
    <main className="min-h-screen px-3 py-4 md:px-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vacation Calendar</p>
          <h1 className="text-lg font-semibold">{activeProfile?.name ?? "No profile yet"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {profileList.length ? (
            <select
              className="h-10 rounded-md border border-border bg-white px-3 text-sm"
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
        <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_18rem]">
          <aside className="grid content-start gap-4">
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Current Vacation Hours</h2>
              <p className="mt-3 text-2xl font-semibold">
                {yearData.data ? formatHoursAndDays(yearData.data.settings.currentVacationHours, yearData.data.settings.standardWorkdayHours) : "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">As of {yearData.data?.settings.currentVacationAsOfDate ?? "-"}</p>
            </section>
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Accrued Since Balance Date</h2>
              <p className="mt-3 text-2xl font-semibold">
                {yearData.data && todayDay?.accruedVacationHoursToDate !== undefined && todayDay?.accruedVacationHoursToDate !== null
                  ? formatHoursAndDays(todayDay.accruedVacationHoursToDate, yearData.data.settings.standardWorkdayHours)
                  : "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Vacation hours earned after the configured balance date.</p>
            </section>
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Projected Balance Today</h2>
              <p className="mt-3 text-2xl font-semibold">
                {yearData.data && todayDay?.runningVacationBalanceHours !== undefined && todayDay?.runningVacationBalanceHours !== null
                  ? formatHoursAndDays(todayDay.runningVacationBalanceHours, yearData.data.settings.standardWorkdayHours)
                  : "-"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Includes configured accrual and calendar overrides.</p>
            </section>
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">End Of Year Projection</h2>
              <p className="mt-3 text-2xl font-semibold">
                {yearData.data && endOfYearDay?.runningVacationBalanceHours !== null && endOfYearDay
                  ? formatHoursAndDays(endOfYearDay.runningVacationBalanceHours!, yearData.data.settings.standardWorkdayHours)
                  : "-"}
              </p>
            </section>
          </aside>

          {yearData.data ? (
            <CalendarGrid
              year={year}
              months={months}
              selectedDate={selectedDate}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              multiDaySelectionEnabled={multiDaySelectionEnabled}
              onMultiDaySelectionChange={toggleMultiDaySelection}
              onSelect={selectCalendarDay}
              onYearChange={setYear}
            />
          ) : (
            <section className="grid min-h-96 place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
              {profiles.isLoading || yearData.isLoading ? "Loading calendar..." : "Create a profile to start simulating."}
            </section>
          )}

          <div className="grid content-start gap-4">
            {yearData.data ? <SettingsPanel profileId={yearData.data.profile.id} settings={yearData.data.settings} /> : null}
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
    </main>
  );
}
