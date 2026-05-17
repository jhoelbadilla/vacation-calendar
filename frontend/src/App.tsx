import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Plus } from "lucide-react";
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
  const [showCreateProfile, setShowCreateProfile] = useState(false);
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

  const months = useMemo(() => {
    if (!yearData.data) return [];
    return buildYearCalendar(year, yearData.data.settings, yearData.data.overrides);
  }, [year, yearData.data]);

  const days = useMemo(() => flattenMonths(months), [months]);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Accrued As Of Today</h2>
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
              onSelect={(day) => setSelectedDate(day.date)}
              onYearChange={setYear}
            />
          ) : (
            <section className="grid min-h-96 place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground">
              {profiles.isLoading || yearData.isLoading ? "Loading calendar..." : "Create a profile to start simulating."}
            </section>
          )}

          <div className="grid content-start gap-4">
            {yearData.data ? <SettingsPanel profileId={yearData.data.profile.id} settings={yearData.data.settings} /> : null}
            {activeProfile ? <DateEditor profileId={activeProfile.id} day={selectedDay} /> : null}
          </div>
        </div>
      </div>

      {noProfiles ? <CreateProfileModal required /> : null}
      {showCreateProfile ? <CreateProfileModal required={false} /> : null}
    </main>
  );
}
