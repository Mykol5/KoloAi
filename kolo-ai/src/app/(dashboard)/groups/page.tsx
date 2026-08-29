"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

/* =========================================================
   TYPES
========================================================= */

type Group = {
  id: string;
  name: string;
  description?: string | null;

  pool_amount?: number | string | null;
  member_count?: number | string | null;
  max_members?: number | string | null;

  status?: string | null;
  cycle_number?: number | string | null;

  contribution_amount?: number | string | null;

  next_due_date?: string | null;
  next_payout_date?: string | null;
  last_payout_date?: string | null;

  location?: string | null;
  city?: string | null;
  state?: string | null;

  created_at?: string | null;

  /*
   * These are populated from verification_submissions.
   */
  verification_status?: string | null;
  reviewed_at?: string | null;
};

type Membership = {
  group_id: string;
  role?: string | null;
  groups: Group | null;
};

type Verification = {
  group_id: string;
  status?: string | null;
  reviewed_at?: string | null;
  cooperative_location?: string | null;
};

type Tab = "mine" | "discover";

type Filter =
  | "all"
  | "verified"
  | "active";

/* =========================================================
   CONSTANTS
========================================================= */

const GREEN = "#006b2c";
const GREEN_DARK = "#005522";
const GREEN_SOFT = "#edf7f0";

const NAVY = "#0b1c30";
const TEXT = "#3e4a3d";
const MUTED = "#6e7b6c";

const BORDER = "#e4e9e6";
const GOLD = "#825100";

/* =========================================================
   HELPERS
========================================================= */

function formatNaira(
  value: number | string | null | undefined
) {
  const amount = Number(value || 0);

  return `₦${amount.toLocaleString(
    "en-NG",
    {
      maximumFractionDigits: 0,
    }
  )}`;
}

function numberValue(
  value: number | string | null | undefined
) {
  return Number(value || 0);
}

/*
 * IMPORTANT:
 *
 * Kolo verification is determined by the
 * verification_submissions.status field.
 *
 * We do NOT depend on a verification_status
 * column in groups.
 */
function isVerified(group: Group) {
  return (
    String(
      group.verification_status || ""
    ).toLowerCase() === "verified"
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function GroupsPage() {
  /*
   * Keep one Supabase client instance.
   */
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [userId, setUserId] =
    useState("");

  const [myGroups, setMyGroups] =
    useState<Group[]>([]);

  const [discoverGroups, setDiscoverGroups] =
    useState<Group[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [discoverLoading, setDiscoverLoading] =
    useState(true);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [tab, setTab] =
    useState<Tab>("mine");

  const [filter, setFilter] =
    useState<Filter>("all");

  const [search, setSearch] =
    useState("");

  const [error, setError] =
    useState("");

  /* =======================================================
     VERIFICATION ENRICHMENT
  ======================================================= */

  const attachVerification =
    useCallback(
      async (
        groups: Group[]
      ): Promise<Group[]> => {
        if (!groups.length) {
          return groups;
        }

        const ids =
          groups.map(
            (group) => group.id
          );

        /*
         * IMPORTANT:
         *
         * Your real database has:
         *
         * status
         * reviewed_at
         *
         * NOT verified_at.
         *
         * Therefore we query reviewed_at.
         */
        const {
          data,
          error:
            verificationError,
        } = await supabase
          .from(
            "verification_submissions"
          )
          .select(
            `
              group_id,
              status,
              reviewed_at,
              cooperative_location
            `
          )
          .in(
            "group_id",
            ids
          )
          .order(
            "reviewed_at",
            {
              ascending: false,
              nullsFirst: false,
            }
          );

        if (
          verificationError
        ) {
          console.error(
            "Verification lookup failed:",
            verificationError
          );

          /*
           * Do NOT silently pretend the group
           * is unverified when the query itself
           * failed.
           */
          throw new Error(
            "Unable to check Kolo verification status."
          );
        }

        /*
         * We may have multiple submissions
         * for one group.
         *
         * Because the results are ordered by
         * reviewed_at descending, the first
         * record for each group is the latest
         * reviewed submission.
         */
        const verificationMap =
          new Map<
            string,
            Verification
          >();

        (
          data || []
        ).forEach(
          (item) => {
            const verification =
              item as Verification;

            if (
              !verificationMap.has(
                verification.group_id
              )
            ) {
              verificationMap.set(
                verification.group_id,
                verification
              );
            }
          }
        );

        return groups.map(
          (group) => {
            const verification =
              verificationMap.get(
                group.id
              );

            return {
              ...group,

              verification_status:
                verification?.status ||
                null,

              reviewed_at:
                verification?.reviewed_at ||
                null,

              /*
               * Prefer group location.
               * Fall back to the verified
               * cooperative location.
               */
              location:
                group.location ||
                group.city ||
                group.state ||
                verification?.cooperative_location ||
                null,
            };
          }
        );
      },
      [supabase]
    );

  /* =======================================================
     LOAD CURRENT USER + MY GROUPS
  ======================================================= */

  const loadMyGroups =
    useCallback(
      async () => {
        try {
          setError("");

          const {
            data: {
              user,
            },
          } =
            await supabase.auth.getUser();

          if (!user) {
            window.location.href =
              "/login";
            return;
          }

          setUserId(user.id);

          const {
            data,
            error:
              membershipError,
          } =
            await supabase
              .from(
                "group_members"
              )
              .select(
                `
                  group_id,
                  role,
                  groups(*)
                `
              )
              .eq(
                "user_id",
                user.id
              );

          if (
            membershipError
          ) {
            console.error(
              "Group membership error:",
              membershipError
            );

            setError(
              "We couldn't load your groups. Please try again."
            );

            return;
          }

          const memberships =
            (data || []) as unknown as Membership[];

          const groups =
            memberships
              .map(
                (item) =>
                  item.groups
              )
              .filter(
                Boolean
              ) as Group[];

          /*
           * Attach actual Kolo verification
           * information from
           * verification_submissions.
           */
          const enriched =
            await attachVerification(
              groups
            );

          setMyGroups(
            enriched
          );

          /*
           * Admin detection.
           */
          const admin =
            memberships.some(
              (membership) => {
                const role =
                  String(
                    membership.role ||
                      ""
                  ).toLowerCase();

                return [
                  "admin",
                  "administrator",
                  "owner",
                  "treasurer",
                ].includes(role);
              }
            );

          setIsAdmin(
            admin
          );
        } catch (err: any) {
          console.error(
            "loadMyGroups:",
            err
          );

          setError(
            err?.message ||
              "Something went wrong while loading your groups."
          );
        }
      },
      [
        supabase,
        attachVerification,
      ]
    );

  /* =======================================================
     LOAD DISCOVERABLE GROUPS
  ======================================================= */

  const loadDiscoverGroups =
    useCallback(
      async (
        currentUserId: string
      ) => {
        try {
          setDiscoverLoading(
            true
          );

          const {
            data,
            error:
              groupsError,
          } =
            await supabase
              .from("groups")
              .select(
                `
                  id,
                  name,
                  description,
                  pool_amount,
                  member_count,
                  max_members,
                  status,
                  cycle_number,
                  contribution_amount,
                  next_due_date,
                  next_payout_date,
                  last_payout_date,
                  created_at
                `
              )
              .neq(
                "status",
                "archived"
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(100);

          if (groupsError) {
            console.error(
              "Discover groups error:",
              groupsError
            );

            setDiscoverGroups(
              []
            );

            return;
          }

          const allGroups =
            (data || []) as Group[];

          /*
           * Get the user's existing
           * groups directly from the
           * groups_members table.
           *
           * This avoids depending on
           * myGroups state inside this
           * function.
           */
          const {
            data:
              membershipData,
            error:
              membershipError,
          } =
            await supabase
              .from(
                "group_members"
              )
              .select(
                "group_id"
              )
              .eq(
                "user_id",
                currentUserId
              );

          if (
            membershipError
          ) {
            console.error(
              "Discover membership lookup error:",
              membershipError
            );
          }

          const myGroupIds =
            new Set(
              (
                membershipData ||
                []
              ).map(
                (item: any) =>
                  item.group_id
              )
            );

          /*
           * Discover only active groups
           * that the user doesn't already
           * belong to.
           */
          const discoverable =
            allGroups.filter(
              (group) => {
                const status =
                  String(
                    group.status ||
                      ""
                  ).toLowerCase();

                return (
                  !myGroupIds.has(
                    group.id
                  ) &&
                  status ===
                    "active"
                );
              }
            );

          /*
           * Attach real verification
           * information.
           */
          const enriched =
            await attachVerification(
              discoverable
            );

          setDiscoverGroups(
            enriched
          );
        } catch (err) {
          console.error(
            "loadDiscoverGroups:",
            err
          );

          setDiscoverGroups(
            []
          );
        } finally {
          setDiscoverLoading(
            false
          );
        }
      },
      [
        supabase,
        attachVerification,
      ]
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    async function initialise() {
      if (!mounted) return;

      setLoading(true);

      await loadMyGroups();

      if (mounted) {
        setLoading(false);
      }
    }

    initialise();

    return () => {
      mounted = false;
    };
  }, [
    loadMyGroups,
  ]);

  /* =======================================================
     LOAD DISCOVER AFTER MY GROUPS
  ======================================================= */

  useEffect(() => {
    if (
      !loading &&
      userId
    ) {
      loadDiscoverGroups(
        userId
      );
    }
  }, [
    loading,
    userId,
    loadDiscoverGroups,
  ]);

  /* =======================================================
     REFRESH WHEN USER RETURNS
  ======================================================= */

  useEffect(() => {
    const refresh =
      () => {
        loadMyGroups();
      };

    window.addEventListener(
      "focus",
      refresh
    );

    const visibilityHandler =
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          refresh();
        }
      };

    document.addEventListener(
      "visibilitychange",
      visibilityHandler
    );

    return () => {
      window.removeEventListener(
        "focus",
        refresh
      );

      document.removeEventListener(
        "visibilitychange",
        visibilityHandler
      );
    };
  }, [
    loadMyGroups,
  ]);

  /* =======================================================
     DISCOVER FILTERING
  ======================================================= */

  const filteredDiscover =
    useMemo(() => {
      let result = [
        ...discoverGroups,
      ];

      const query =
        search
          .trim()
          .toLowerCase();

      if (query) {
        result =
          result.filter(
            (group) => {
              const name =
                String(
                  group.name ||
                    ""
                ).toLowerCase();

              const description =
                String(
                  group.description ||
                    ""
                ).toLowerCase();

              const location =
                String(
                  group.location ||
                    ""
                ).toLowerCase();

              return (
                name.includes(
                  query
                ) ||
                description.includes(
                  query
                ) ||
                location.includes(
                  query
                )
              );
            }
          );
      }

      if (
        filter ===
        "verified"
      ) {
        result =
          result.filter(
            isVerified
          );
      }

      if (
        filter ===
        "active"
      ) {
        result =
          result.filter(
            (group) =>
              String(
                group.status ||
                  ""
              ).toLowerCase() ===
              "active"
          );
      }

      /*
       * Verified groups first.
       */
      result.sort(
        (a, b) =>
          Number(
            isVerified(b)
          ) -
          Number(
            isVerified(a)
          )
      );

      return result;
    }, [
      discoverGroups,
      search,
      filter,
    ]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const verifiedDiscoverCount =
    discoverGroups.filter(
      isVerified
    ).length;

  const activeDiscoverCount =
    discoverGroups.filter(
      (group) =>
        String(
          group.status ||
            ""
        ).toLowerCase() ===
        "active"
    ).length;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="groupsLoading">
        <div className="loadingMark">
          K
        </div>

        <div className="loadingTitle">
          Loading your groups
        </div>

        <div className="loadingSub">
          Preparing your Kolo community
          view...
        </div>

        <style jsx>{`
          .groupsLoading {
            min-height: 65vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: ${MUTED};
            font-family:
              Inter,
              Geist,
              system-ui,
              sans-serif;
          }

          .loadingMark {
            width: 56px;
            height: 56px;
            display: grid;
            place-items: center;
            margin-bottom: 20px;
            border-radius: 16px;
            background: ${GREEN};
            color: white;
            font-size: 24px;
            font-weight: 850;
            box-shadow:
              0 12px 28px
              rgba(0, 107, 44, .15);
          }

          .loadingTitle {
            color: ${NAVY};
            font-size: 20px;
            font-weight: 750;
          }

          .loadingSub {
            margin-top: 8px;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="groupsPage">

      {/* TOP BAR */}

      <header className="topbar">

        <div className="breadcrumbs">
          <span>
            Directory
          </span>

          <span className="material-symbols-outlined">
            chevron_right
          </span>

          <strong>
            Groups
          </strong>
        </div>

        <div className="searchBox">
          <span className="material-symbols-outlined">
            search
          </span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search groups..."
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              close
            </button>
          )}
        </div>

        <button
          type="button"
          className="notificationButton"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined">
            notifications
          </span>
        </button>

      </header>

      {/* HERO */}

      <section className="hero">

        <div className="heroContent">

          <div className="eyebrow">
            KOLO COMMUNITY
          </div>

          <h1>
            Savings groups
          </h1>

          <p>
            Stay connected to the communities
            you're saving with and discover
            groups that may fit your savings
            journey.
          </p>

        </div>

        {isAdmin && (
          <Link
            href="/groups/create"
            className="createButton"
          >
            <span className="material-symbols-outlined">
              add
            </span>

            Create group
          </Link>
        )}

      </section>

      {/* ERROR */}

      {error && (
        <div className="errorBox">

          <div className="errorIcon">
            !
          </div>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() => {
              setError("");
              loadMyGroups();
            }}
          >
            Retry
          </button>

        </div>
      )}

      {/* TABS */}

      <div className="tabs">

        <button
          type="button"
          className={
            tab === "mine"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            setTab("mine")
          }
        >
          <span className="material-symbols-outlined">
            groups
          </span>

          <span>
            My Groups
          </span>

          <b>
            {myGroups.length}
          </b>
        </button>

        <button
          type="button"
          className={
            tab === "discover"
              ? "tab active"
              : "tab"
          }
          onClick={() =>
            setTab("discover")
          }
        >
          <span className="material-symbols-outlined">
            explore
          </span>

          <span>
            Discover
          </span>

          <b>
            {discoverGroups.length}
          </b>
        </button>

      </div>

      {/* =====================================================
          MY GROUPS
      ===================================================== */}

      {tab === "mine" && (
        <section>

          <div className="sectionHeader">

            <div>

              <div className="sectionEyebrow">
                YOUR COMMUNITY
              </div>

              <h2>
                Groups you belong to
              </h2>

              <p>
                Your active savings communities
                and their current status.
              </p>

            </div>

            <button
              type="button"
              className="discoverButton"
              onClick={() =>
                setTab("discover")
              }
            >
              Discover groups

              <span className="material-symbols-outlined">
                arrow_forward
              </span>
            </button>

          </div>

          {myGroups.length === 0 ? (
            <EmptyGroups
              isAdmin={isAdmin}
              onDiscover={() =>
                setTab("discover")
              }
            />
          ) : (
            <div className="grid">

              {myGroups.map(
                (group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    mine
                  />
                )
              )}

            </div>
          )}

        </section>
      )}

      {/* =====================================================
          DISCOVER
      ===================================================== */}

      {tab === "discover" && (
        <section>

          <div className="discoverHeader">

            <div className="discoverCopy">

              <div className="sectionEyebrow">
                DISCOVER
              </div>

              <h2>
                Find a savings community
              </h2>

              <p>
                Explore active groups beyond
                the communities you already
                belong to. Review the group's
                information and Kolo trust
                status before making decisions.
              </p>

            </div>

            <div className="discoverStats">

              <div className="discoverStat">
                <strong>
                  {discoverGroups.length}
                </strong>

                <span>
                  Groups
                </span>
              </div>

              <div className="discoverDivider" />

              <div className="discoverStat">
                <strong>
                  {verifiedDiscoverCount}
                </strong>

                <span>
                  Verified
                </span>
              </div>

              <div className="discoverDivider" />

              <div className="discoverStat">
                <strong>
                  {activeDiscoverCount}
                </strong>

                <span>
                  Active
                </span>
              </div>

            </div>

          </div>

          {/* FILTERS */}

          <div className="filters">

            <button
              type="button"
              className={
                filter === "all"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter("all")
              }
            >
              All groups
            </button>

            <button
              type="button"
              className={
                filter ===
                "verified"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter(
                  "verified"
                )
              }
            >
              <span className="material-symbols-outlined">
                verified
              </span>

              Kolo Verified
            </button>

            <button
              type="button"
              className={
                filter === "active"
                  ? "filter active"
                  : "filter"
              }
              onClick={() =>
                setFilter("active")
              }
            >
              Active
            </button>

          </div>

          {/* DISCOVER CONTENT */}

          {discoverLoading ? (
            <div className="discoverLoading">

              <div className="spinner" />

              <strong>
                Finding groups
              </strong>

              <span>
                Checking available communities...
              </span>

            </div>
          ) : filteredDiscover.length ===
            0 ? (
            <div className="noResults">

              <div className="noResultsIcon">
                <span className="material-symbols-outlined">
                  search_off
                </span>
              </div>

              <h3>
                No groups found
              </h3>

              <p>
                Try a different search or
                filter. New communities will
                appear here when available.
              </p>

              {(search ||
                filter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              )}

            </div>
          ) : (
            <div className="grid">

              {filteredDiscover.map(
                (group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                  />
                )
              )}

            </div>
          )}

        </section>
      )}

      {/* TRUST NOTE */}

      <div className="trustFooter">

        <span className="material-symbols-outlined">
          verified_user
        </span>

        <div>

          <strong>
            Understanding Kolo Verification
          </strong>

          <p>
            Kolo Verified means the group's
            submitted cooperative and
            administrator information has
            completed Kolo's review process.
            It is a trust signal, not a guarantee
            against financial loss.
          </p>

        </div>

      </div>

      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        .groupsPage {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 0 60px;
          color: ${NAVY};

          font-family:
            Inter,
            Geist,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        /* TOPBAR */

        .topbar {
          min-height: 66px;
          display: grid;

          grid-template-columns:
            1fr
            minmax(280px, 440px)
            1fr;

          align-items: center;
          gap: 20px;
          margin-bottom: 42px;

          border-bottom:
            1px solid
            rgba(189, 202, 186, .35);
        }

        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 6px;

          color: ${MUTED};
          font-size: 14px;
          font-weight: 600;
        }

        .breadcrumbs strong {
          color: ${GREEN};
        }

        .breadcrumbs
        .material-symbols-outlined {
          font-size: 18px;
        }

        .searchBox {
          position: relative;
        }

        .searchBox
        > .material-symbols-outlined {
          position: absolute;
          left: 14px;
          top: 50%;
          transform:
            translateY(-50%);

          color: ${MUTED};
          font-size: 20px;
        }

        .searchBox input {
          width: 100%;
          height: 44px;

          padding:
            0 40px
            0 42px;

          border:
            1.5px solid
            ${BORDER};

          border-radius: 999px;
          outline: none;

          background: #f7f9f8;
          color: ${NAVY};

          font-family: inherit;
          font-size: 14px;

          transition: .18s ease;
        }

        .searchBox input:focus {
          background: white;

          border-color:
            #9bc4a9;

          box-shadow:
            0 0 0 3px
            ${GREEN_SOFT};
        }

        .searchBox button {
          position: absolute;
          right: 10px;
          top: 50%;

          transform:
            translateY(-50%);

          border: 0;
          background: transparent;
          color: ${MUTED};

          cursor: pointer;

          font-family:
            "Material Symbols Outlined";

          font-size: 20px;
        }

        .notificationButton {
          justify-self: end;

          width: 44px;
          height: 44px;

          display: grid;
          place-items: center;

          border:
            1.5px solid
            ${BORDER};

          border-radius: 50%;

          background: white;
          color: ${GREEN};

          cursor: pointer;
        }

        .notificationButton
        .material-symbols-outlined {
          font-size: 22px;
        }

        /* HERO */

        .hero {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;

          gap: 30px;
          margin-bottom: 36px;
        }

        .heroContent {
          max-width: 720px;
        }

        .eyebrow,
        .sectionEyebrow {
          color: ${GREEN};

          font-size: 11px;
          font-weight: 850;
          letter-spacing: .16em;
        }

        .hero h1 {
          margin:
            12px 0 12px;

          color: ${NAVY};

          font-size: 40px;
          line-height: 1;
          letter-spacing: -.05em;
          font-weight: 760;
        }

        .hero p {
          max-width: 680px;

          margin: 0;

          color: ${TEXT};

          font-size: 15px;
          line-height: 1.7;
        }

        .createButton {
          min-height: 48px;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          padding:
            0 22px;

          border-radius: 999px;

          background: ${GREEN};
          color: white;

          text-decoration: none;

          font-size: 14px;
          font-weight: 750;

          white-space: nowrap;

          transition:
            transform .18s ease,
            background .18s ease,
            box-shadow .18s ease;
        }

        .createButton:hover {
          background: ${GREEN_DARK};

          transform:
            translateY(-2px);

          box-shadow:
            0 12px 24px
            rgba(0, 107, 44, .18);
        }

        .createButton
        .material-symbols-outlined {
          font-size: 22px;
        }

        /* ERROR */

        .errorBox {
          display: flex;
          align-items: center;
          gap: 12px;

          margin-bottom: 20px;
          padding: 14px 16px;

          border:
            1px solid
            #eadfbd;

          border-radius: 12px;

          background: #fff8eb;
          color: ${GOLD};

          font-size: 13px;
        }

        .errorIcon {
          width: 24px;
          height: 24px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background: #f1e4bf;

          font-weight: 800;
        }

        .errorBox button {
          margin-left: auto;

          border: 0;
          background: transparent;

          color: ${GOLD};

          cursor: pointer;

          font-family: inherit;
          font-size: 13px;
          font-weight: 800;
        }

        /* TABS */

        .tabs {
          display: flex;
          align-items: center;
          gap: 2px;

          margin-bottom: 32px;

          border-bottom:
            1px solid
            ${BORDER};
        }

        .tab {
          min-height: 52px;

          display: flex;
          align-items: center;
          gap: 8px;

          padding:
            0 18px;

          margin-bottom: -1px;

          border: 0;

          border-bottom:
            2px solid
            transparent;

          background: transparent;

          color: ${MUTED};

          cursor: pointer;

          font-family: inherit;

          font-size: 14px;
          font-weight: 750;
        }

        .tab.active {
          color: ${GREEN};

          border-bottom-color:
            ${GREEN};
        }

        .tab
        .material-symbols-outlined {
          font-size: 22px;
        }

        .tab b {
          min-width: 24px;

          padding:
            4px 8px;

          border-radius: 999px;

          background:
            #f0f3f1;

          font-size: 12px;
        }

        .tab.active b {
          background:
            ${GREEN_SOFT};

          color:
            ${GREEN};
        }

        /* SECTION HEADER */

        .sectionHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;

          gap: 20px;

          margin-bottom: 20px;
        }

        .sectionHeader h2,
        .discoverHeader h2 {
          margin:
            8px 0 8px;

          color: ${NAVY};

          font-size: 26px;
          letter-spacing: -.035em;
          font-weight: 760;
        }

        .sectionHeader p {
          margin: 0;

          color: ${MUTED};

          font-size: 14px;
        }

        .discoverButton {
          display: inline-flex;
          align-items: center;
          gap: 6px;

          border: 0;
          background: transparent;

          color: ${GREEN};

          cursor: pointer;

          font-family: inherit;
          font-size: 14px;
          font-weight: 800;
        }

        .discoverButton
        .material-symbols-outlined {
          font-size: 20px;
        }

        /* DISCOVER HEADER */

        .discoverHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 30px;

          padding: 24px;
          margin-bottom: 20px;

          border:
            1px solid
            #dcebe1;

          border-radius: 16px;

          background:
            linear-gradient(
              135deg,
              #f0f8f3,
              #f8fbf9
            );
        }

        .discoverCopy {
          max-width: 650px;
        }

        .discoverHeader p {
          margin: 0;

          color: ${TEXT};

          font-size: 14px;
          line-height: 1.65;
        }

        .discoverStats {
          display: flex;
          align-items: center;

          gap: 20px;

          flex-shrink: 0;
        }

        .discoverStat {
          display: flex;
          flex-direction: column;

          gap: 6px;
        }

        .discoverStat strong {
          color: ${NAVY};

          font-size: 24px;
          line-height: 1;
        }

        .discoverStat span {
          color: ${MUTED};

          font-size: 12px;
          font-weight: 700;
        }

        .discoverDivider {
          width: 1px;
          height: 36px;

          background:
            #d5e1d9;
        }

        /* FILTERS */

        .filters {
          display: flex;
          align-items: center;

          gap: 8px;

          margin-bottom: 24px;
        }

        .filter {
          display: inline-flex;
          align-items: center;

          gap: 6px;

          padding:
            10px 16px;

          border:
            1.5px solid
            ${BORDER};

          border-radius: 999px;

          background: white;

          color: ${MUTED};

          cursor: pointer;

          font-family: inherit;
          font-size: 12px;
          font-weight: 750;

          transition:
            .16s ease;
        }

        .filter:hover {
          border-color:
            #bfd2c5;
        }

        .filter.active {
          border-color:
            ${GREEN};

          background:
            ${GREEN};

          color: white;
        }

        .filter
        .material-symbols-outlined {
          font-size: 16px;
        }

        /* GRID */

        .grid {
          display: grid;

          grid-template-columns:
            repeat(
              3,
              minmax(0, 1fr)
            );

          gap: 20px;
        }

        /* GROUP CARD */

        .groupCardLink {
          display: block;

          height: 100%;

          color: inherit;

          text-decoration: none;
        }

        .groupCard {
          height: 100%;

          display: flex;
          flex-direction: column;

          gap: 14px;

          padding: 20px;

          border:
            1px solid
            ${BORDER};

          border-radius: 16px;

          background: white;

          box-shadow:
            0 5px 20px
            rgba(
              15,
              23,
              42,
              .025
            );

          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease;
        }

        .groupCard:hover {
          transform:
            translateY(-3px);

          border-color:
            #c6dacd;

          box-shadow:
            0 16px 36px
            rgba(
              15,
              23,
              42,
              .08
            );
        }

        .cardTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: 12px;
        }

        .identity {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 12px;
        }

        .groupIcon {
          width: 48px;
          height: 48px;

          display: grid;
          place-items: center;

          flex: 0 0 auto;

          border-radius: 14px;

          background:
            ${GREEN_SOFT};

          color:
            ${GREEN};
        }

        .groupIcon
        .material-symbols-outlined {
          font-size: 26px;
        }

        .identityText {
          min-width: 0;
        }

        .identityText h3 {
          margin:
            0 0 6px;

          overflow: hidden;

          color: ${NAVY};

          font-size: 16px;
          font-weight: 760;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;
        }

        .identityText span {
          display: block;

          max-width: 210px;

          overflow: hidden;

          color: ${MUTED};

          font-size: 12px;
          font-weight: 600;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;
        }

        /* STATUS */

        .status {
          padding:
            6px 10px;

          border-radius: 999px;

          font-size: 11px;
          font-weight: 850;

          white-space: nowrap;
        }

        .status.active {
          background:
            ${GREEN_SOFT};

          color:
            ${GREEN};
        }

        .status.other {
          background:
            #f1f3f2;

          color:
            ${MUTED};
        }

        /* VERIFICATION */

        .verification {
          min-height: 32px;

          display: flex;
          align-items: center;

          gap: 6px;

          padding:
            0 12px;

          border-radius: 10px;

          background:
            ${GREEN_SOFT};

          color:
            ${GREEN};

          font-size: 12px;
          font-weight: 800;
        }

        .verification.unverified {
          background:
            #f5f6f5;

          color:
            ${MUTED};
        }

        .verification
        .material-symbols-outlined {
          font-size: 18px;
        }

        /* INSIGHT */

        .insight {
          min-height: 48px;

          padding: 12px;

          border-radius: 10px;

          background:
            #fafcf9;

          color: ${TEXT};

          font-size: 12px;
          line-height: 1.55;
        }

        .insight strong {
          color:
            ${GREEN};
        }

        /* STATS */

        .stats {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: 14px;

          padding:
            14px 0;

          border-top:
            1px solid
            #edf0ee;

          border-bottom:
            1px solid
            #edf0ee;
        }

        .stat span {
          display: block;

          margin-bottom: 6px;

          color: ${MUTED};

          font-size: 10px;
          font-weight: 800;

          letter-spacing:
            .04em;
        }

        .stat strong {
          color:
            ${NAVY};

          font-size: 14px;
          font-weight: 760;
        }

        .stat strong.money {
          color:
            ${GREEN};
        }

        /* CAPACITY */

        .capacity {
          padding-top: 2px;
        }

        .capacityHead {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-bottom: 8px;
        }

        .capacityHead span {
          color: ${MUTED};

          font-size: 10px;
          font-weight: 800;
        }

        .capacityHead strong {
          color: ${GREEN};

          font-size: 12px;
        }

        .capacityBar {
          width: 100%;
          height: 5px;

          overflow: hidden;

          border-radius: 999px;

          background:
            #edf1ee;
        }

        .capacityFill {
          height: 100%;

          border-radius: inherit;

          background:
            ${GREEN};

          transition:
            width .4s ease;
        }

        /* FOOTER */

        .cardBottom {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          margin-top: auto;
        }

        .location {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 6px;

          color: ${MUTED};

          font-size: 12px;
        }

        .location
        .material-symbols-outlined {
          flex: 0 0 auto;

          font-size: 18px;
        }

        .locationText {
          overflow: hidden;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;
        }

        .arrow {
          width: 36px;
          height: 36px;

          display: grid;
          place-items: center;

          flex: 0 0 auto;

          border-radius: 50%;

          background:
            ${NAVY};

          color: white;
        }

        .arrow
        .material-symbols-outlined {
          font-size: 20px;
        }

        /* EMPTY */

        .empty {
          padding:
            70px 24px;

          border:
            1.5px dashed
            ${BORDER};

          border-radius: 16px;

          background: white;

          text-align: center;
        }

        .emptyIcon {
          width: 64px;
          height: 64px;

          display: grid;
          place-items: center;

          margin:
            0 auto 16px;

          border-radius: 18px;

          background:
            #f1f4f2;

          color:
            ${GREEN};
        }

        .emptyIcon
        .material-symbols-outlined {
          font-size: 32px;
        }

        .empty h3 {
          margin:
            0 0 8px;

          color:
            ${NAVY};

          font-size: 22px;
        }

        .empty p {
          max-width: 480px;

          margin:
            0 auto 24px;

          color:
            ${MUTED};

          font-size: 14px;

          line-height: 1.65;
        }

        .emptyActions {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 12px;
        }

        .emptyActions button,
        .emptyActions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          min-height: 44px;

          padding:
            0 18px;

          border-radius: 12px;

          font-family: inherit;
          font-size: 13px;
          font-weight: 800;

          text-decoration: none;

          cursor: pointer;
        }

        .emptyActions button {
          border:
            1.5px solid
            ${BORDER};

          background: white;

          color:
            ${GREEN};
        }

        .emptyActions a {
          background:
            ${GREEN};

          color: white;
        }

        /* DISCOVER LOADING */

        .discoverLoading {
          min-height: 280px;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          gap: 10px;

          border:
            1px solid
            ${BORDER};

          border-radius: 16px;

          background: white;

          color: ${MUTED};

          font-size: 14px;
        }

        .discoverLoading strong {
          color: ${NAVY};

          font-size: 16px;
        }

        .spinner {
          width: 32px;
          height: 32px;

          margin-bottom: 8px;

          border:
            3px solid
            #e5ece7;

          border-top-color:
            ${GREEN};

          border-radius: 50%;

          animation:
            groupSpin .7s
            linear infinite;
        }

        @keyframes groupSpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        /* NO RESULTS */

        .noResults {
          min-height: 300px;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          padding: 40px;

          border:
            1px solid
            ${BORDER};

          border-radius: 16px;

          background: white;

          text-align: center;
        }

        .noResultsIcon {
          width: 56px;
          height: 56px;

          display: grid;
          place-items: center;

          border-radius: 16px;

          background:
            #f2f5f3;

          color:
            ${MUTED};
        }

        .noResultsIcon
        .material-symbols-outlined {
          font-size: 28px;
        }

        .noResults h3 {
          margin:
            16px 0 8px;

          color:
            ${NAVY};

          font-size: 20px;
        }

        .noResults p {
          max-width: 440px;

          margin: 0;

          color:
            ${MUTED};

          font-size: 13px;

          line-height: 1.65;
        }

        .noResults button {
          margin-top: 20px;

          min-height: 40px;

          padding:
            0 16px;

          border:
            1.5px solid
            ${BORDER};

          border-radius: 10px;

          background: white;

          color:
            ${GREEN};

          cursor: pointer;

          font-family: inherit;

          font-size: 13px;
          font-weight: 800;
        }

        /* TRUST FOOTER */

        .trustFooter {
          display: flex;
          align-items: flex-start;

          gap: 12px;

          max-width: 800px;

          margin-top: 36px;

          padding: 16px;

          border-radius: 12px;

          background:
            #f7faf8;
        }

        .trustFooter
        > .material-symbols-outlined {
          flex: 0 0 auto;

          color:
            ${GREEN};

          font-size: 22px;
        }

        .trustFooter strong {
          display: block;

          margin-bottom: 6px;

          color:
            ${NAVY};

          font-size: 13px;
        }

        .trustFooter p {
          margin: 0;

          color:
            ${MUTED};

          font-size: 12px;

          line-height: 1.65;
        }

        /* RESPONSIVE */

        @media (max-width: 1050px) {
          .grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 760px) {
          .groupsPage {
            padding:
              0 14px 45px;
          }

          .topbar {
            grid-template-columns:
              1fr auto;

            gap: 12px;

            margin-bottom:
              30px;
          }

          .searchBox {
            grid-column:
              1 / -1;

            grid-row: 2;
          }

          .hero {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .createButton {
            width: 100%;
          }

          .grid {
            grid-template-columns:
              1fr;
          }

          .discoverHeader {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .discoverStats {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .hero h1 {
            font-size: 32px;
          }

          .sectionHeader {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .discoverButton {
            padding: 0;
          }

          .tabs {
            width: 100%;
          }

          .tab {
            flex: 1;

            justify-content:
              center;
          }

          .tab
          .material-symbols-outlined {
            display: none;
          }

          .filters {
            overflow-x: auto;

            flex-wrap:
              nowrap;

            padding-bottom: 3px;
          }

          .filter {
            flex-shrink: 0;

            white-space:
              nowrap;
          }

          .discoverStats {
            justify-content:
              space-between;
          }

          .discoverDivider {
            height: 24px;
          }

          .status {
            display: none;
          }
        }

      `}</style>
    </main>
  );
}

/* =========================================================
   GROUP CARD
========================================================= */

function GroupCard({
  group,
  mine = false,
}: {
  group: Group;
  mine?: boolean;
}) {
  const verified =
    isVerified(group);

  const members =
    numberValue(
      group.member_count
    );

  const maximum =
    numberValue(
      group.max_members
    ) || 20;

  const pool =
    numberValue(
      group.pool_amount
    );

  const contribution =
    numberValue(
      group.contribution_amount
    );

  const capacity =
    maximum > 0
      ? Math.min(
          100,
          Math.round(
            (members /
              maximum) *
              100
          )
        )
      : 0;

  const status =
    String(
      group.status ||
        "active"
    );

  const location =
    group.location ||
    group.city ||
    group.state ||
    "Location not provided";

  /* =======================================================
     INTELLIGENCE
  ======================================================= */

  let insight =
    "Review the group's details before making a decision.";

  if (verified) {
    if (members >= 10) {
      insight =
        "Kolo Verified · This is an established group with a strong member base.";
    } else if (
      capacity >= 80
    ) {
      insight =
        "Kolo Verified · The group is close to its stated membership capacity.";
    } else {
      insight =
        "Kolo Verified · The group's submitted cooperative information has completed Kolo review.";
    }
  } else if (
    status.toLowerCase() ===
    "active"
  ) {
    insight =
      "Active group · Check its Kolo verification status and group details before committing funds.";
  }

  if (
    members >= maximum &&
    maximum > 0
  ) {
    insight = verified
      ? "Kolo Verified · The group has reached its stated member capacity."
      : "The group has reached its stated member capacity.";
  }

  return (
    <Link
      href={`/groups/${group.id}`}
      className="groupCardLink"
    >
      <article className="groupCard">

        {/* TOP */}

        <div className="cardTop">

          <div className="identity">

            <div className="groupIcon">
              <span className="material-symbols-outlined">
                account_balance
              </span>
            </div>

            <div className="identityText">

              <h3>
                {group.name}
              </h3>

              <span>
                {group.description ||
                  "Savings community"}
              </span>

            </div>

          </div>

          <span
            className={
              status.toLowerCase() ===
              "active"
                ? "status active"
                : "status other"
            }
          >
            {status}
          </span>

        </div>

        {/* VERIFICATION */}

        <div
          className={
            verified
              ? "verification"
              : "verification unverified"
          }
        >

          <span className="material-symbols-outlined">
            {verified
              ? "verified"
              : "help_outline"}
          </span>

          {verified
            ? "Kolo Verified"
            : "Not Kolo Verified"}

        </div>

        {/* INSIGHT */}

        <div className="insight">

          <strong>
            Kolo insight:
          </strong>{" "}

          {insight}

        </div>

        {/* STATS */}

        <div className="stats">

          <div className="stat">

            <span>
              MEMBERS
            </span>

            <strong>
              {members}
              {" / "}
              {maximum}
            </strong>

          </div>

          <div className="stat">

            <span>
              CONTRIBUTION
            </span>

            <strong className="money">
              {contribution > 0
                ? formatNaira(
                    contribution
                  )
                : "Not specified"}
            </strong>

          </div>

          <div className="stat">

            <span>
              CURRENT POOL
            </span>

            <strong className="money">
              {formatNaira(
                pool
              )}
            </strong>

          </div>

          <div className="stat">

            <span>
              CYCLE
            </span>

            <strong>
              {group.cycle_number
                ? `Cycle ${group.cycle_number}`
                : "Current"}
            </strong>

          </div>

        </div>

        {/* CAPACITY */}

        <div className="capacity">

          <div className="capacityHead">

            <span>
              GROUP CAPACITY
            </span>

            <strong>
              {capacity}%
            </strong>

          </div>

          <div className="capacityBar">

            <div
              className="capacityFill"
              style={{
                width:
                  `${capacity}%`,
              }}
            />

          </div>

        </div>

        {/* FOOTER */}

        <div className="cardBottom">

          <div className="location">

            <span className="material-symbols-outlined">
              location_on
            </span>

            <span className="locationText">
              {location}
            </span>

          </div>

          <div className="arrow">

            <span className="material-symbols-outlined">
              arrow_forward
            </span>

          </div>

        </div>

      </article>
    </Link>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyGroups({
  isAdmin,
  onDiscover,
}: {
  isAdmin: boolean;
  onDiscover: () => void;
}) {
  return (
    <div className="empty">

      <div className="emptyIcon">

        <span className="material-symbols-outlined">
          groups
        </span>

      </div>

      <h3>
        You haven't joined a group yet
      </h3>

      <p>
        Explore other savings communities
        or create a group if you're an
        authorized Kolo administrator.
      </p>

      <div className="emptyActions">

        <button
          type="button"
          onClick={onDiscover}
        >
          Explore groups
        </button>

        {isAdmin && (
          <Link
            href="/groups/create"
          >
            Create group
          </Link>
        )}

      </div>

    </div>
  );
}




// "use client";

// import Link from "next/link";
// import {
//   useCallback,
//   useEffect,
//   useMemo,
//   useState,
// } from "react";

// import { createClient } from "@/lib/supabase/client";

// /* =========================================================
//    TYPES
// ========================================================= */

// type Group = {
//   verification_status?: string | null;
//   verified_at?: string | null;
//   id: string;
//   name: string;
//   description?: string | null;

//   pool_amount?: number | string | null;
//   member_count?: number | string | null;
//   max_members?: number | string | null;

//   status?: string | null;
//   cycle_number?: number | string | null;

//   contribution_amount?: number | string | null;

//   next_due_date?: string | null;
//   next_payout_date?: string | null;
//   last_payout_date?: string | null;

//   location?: string | null;
//   city?: string | null;
//   state?: string | null;

//   created_at?: string | null;

//   /*
//    * These are populated from verification_submissions.
//    */
//   verification_status?: string | null;
//   reviewed_at?: string | null;
// };

// type Membership = {
//   group_id: string;
//   role?: string | null;
//   groups: Group | null;
// };

// type Verification = {
//   group_id: string;
//   status?: string | null;
//   reviewed_at?: string | null;
//   cooperative_location?: string | null;
// };

// type Tab = "mine" | "discover";

// type Filter =
//   | "all"
//   | "verified"
//   | "active";

// /* =========================================================
//    CONSTANTS
// ========================================================= */

// const GREEN = "#006b2c";
// const GREEN_DARK = "#005522";
// const GREEN_SOFT = "#edf7f0";

// const NAVY = "#0b1c30";
// const TEXT = "#3e4a3d";
// const MUTED = "#6e7b6c";

// const BORDER = "#e4e9e6";
// const GOLD = "#825100";

// /* =========================================================
//    HELPERS
// ========================================================= */

// function formatNaira(
//   value: number | string | null | undefined
// ) {
//   const amount = Number(value || 0);

//   return `₦${amount.toLocaleString(
//     "en-NG",
//     {
//       maximumFractionDigits: 0,
//     }
//   )}`;
// }

// function numberValue(
//   value: number | string | null | undefined
// ) {
//   return Number(value || 0);
// }

// /*
//  * IMPORTANT:
//  *
//  * Kolo verification is determined by the
//  * verification_submissions.status field.
//  *
//  * We do NOT depend on a verification_status
//  * column in groups.
//  */
// function isVerified(group: Group) {
//   return (
//     String(
//       group.verification_status || ""
//     ).toLowerCase() === "verified"
//   );
// }

// /* =========================================================
//    PAGE
// ========================================================= */

// export default function GroupsPage() {
//   /*
//    * Keep one Supabase client instance.
//    */
//   const supabase = useMemo(
//     () => createClient(),
//     []
//   );

//   const [userId, setUserId] =
//     useState("");

//   const [myGroups, setMyGroups] =
//     useState<Group[]>([]);

//   const [discoverGroups, setDiscoverGroups] =
//     useState<Group[]>([]);

//   const [loading, setLoading] =
//     useState(true);

//   const [discoverLoading, setDiscoverLoading] =
//     useState(true);

//   const [isAdmin, setIsAdmin] =
//     useState(false);

//   const [tab, setTab] =
//     useState<Tab>("mine");

//   const [filter, setFilter] =
//     useState<Filter>("all");

//   const [search, setSearch] =
//     useState("");

//   const [error, setError] =
//     useState("");

//   /* =======================================================
//      VERIFICATION ENRICHMENT
//   ======================================================= */

//   const attachVerification =
//     useCallback(
//       async (
//         groups: Group[]
//       ): Promise<Group[]> => {
//         if (!groups.length) {
//           return groups;
//         }

//         const ids =
//           groups.map(
//             (group) => group.id
//           );

//         /*
//          * IMPORTANT:
//          *
//          * Your real database has:
//          *
//          * status
//          * reviewed_at
//          *
//          * NOT verified_at.
//          *
//          * Therefore we query reviewed_at.
//          */
//         const {
//           data,
//           error:
//             verificationError,
//         } = await supabase
//           .from(
//             "verification_submissions"
//           )
//           .select(
//             `
//               group_id,
//               status,
//               reviewed_at,
//               cooperative_location
//             `
//           )
//           .in(
//             "group_id",
//             ids
//           )
//           .order(
//             "reviewed_at",
//             {
//               ascending: false,
//               nullsFirst: false,
//             }
//           );

//         if (
//           verificationError
//         ) {
//           console.error(
//             "Verification lookup failed:",
//             verificationError
//           );

//           /*
//            * Do NOT silently pretend the group
//            * is unverified when the query itself
//            * failed.
//            */
//           throw new Error(
//             "Unable to check Kolo verification status."
//           );
//         }

//         /*
//          * We may have multiple submissions
//          * for one group.
//          *
//          * Because the results are ordered by
//          * reviewed_at descending, the first
//          * record for each group is the latest
//          * reviewed submission.
//          */
//         const verificationMap =
//           new Map<
//             string,
//             Verification
//           >();

//         (
//           data || []
//         ).forEach(
//           (item) => {
//             const verification =
//               item as Verification;

//             if (
//               !verificationMap.has(
//                 verification.group_id
//               )
//             ) {
//               verificationMap.set(
//                 verification.group_id,
//                 verification
//               );
//             }
//           }
//         );

//         return groups.map(
//           (group) => {
//             const verification =
//               verificationMap.get(
//                 group.id
//               );

//             return {
//               ...group,

//               verification_status:
//                 verification?.status ||
//                 null,

//               reviewed_at:
//                 verification?.reviewed_at ||
//                 null,

//               /*
//                * Prefer group location.
//                * Fall back to the verified
//                * cooperative location.
//                */
//               location:
//                 group.location ||
//                 group.city ||
//                 group.state ||
//                 verification?.cooperative_location ||
//                 null,
//             };
//           }
//         );
//       },
//       [supabase]
//     );

//   /* =======================================================
//      LOAD CURRENT USER + MY GROUPS
//   ======================================================= */

//   const loadMyGroups =
//     useCallback(
//       async () => {
//         try {
//           setError("");

//           const {
//             data: {
//               user,
//             },
//           } =
//             await supabase.auth.getUser();

//           if (!user) {
//             window.location.href =
//               "/login";
//             return;
//           }

//           setUserId(user.id);

//           const {
//             data,
//             error:
//               membershipError,
//           } =
//             await supabase
//               .from(
//                 "group_members"
//               )
//               .select(
//                 `
//                   group_id,
//                   role,
//                   groups(*)
//                 `
//               )
//               .eq(
//                 "user_id",
//                 user.id
//               );

//           if (
//             membershipError
//           ) {
//             console.error(
//               "Group membership error:",
//               membershipError
//             );

//             setError(
//               "We couldn't load your groups. Please try again."
//             );

//             return;
//           }

//           const memberships =
//             (data || []) as unknown as Membership[];

//           const groups =
//             memberships
//               .map(
//                 (item) =>
//                   item.groups
//               )
//               .filter(
//                 Boolean
//               ) as Group[];

//           /*
//            * Attach actual Kolo verification
//            * information from
//            * verification_submissions.
//            */
//           const enriched =
//             await attachVerification(
//               groups
//             );

//           setMyGroups(
//             enriched
//           );

//           /*
//            * Admin detection.
//            */
//           const admin =
//             memberships.some(
//               (membership) => {
//                 const role =
//                   String(
//                     membership.role ||
//                       ""
//                   ).toLowerCase();

//                 return [
//                   "admin",
//                   "administrator",
//                   "owner",
//                   "treasurer",
//                 ].includes(role);
//               }
//             );

//           setIsAdmin(
//             admin
//           );
//         } catch (err: any) {
//           console.error(
//             "loadMyGroups:",
//             err
//           );

//           setError(
//             err?.message ||
//               "Something went wrong while loading your groups."
//           );
//         }
//       },
//       [
//         supabase,
//         attachVerification,
//       ]
//     );

//   /* =======================================================
//      LOAD DISCOVERABLE GROUPS
//   ======================================================= */

//   const loadDiscoverGroups =
//     useCallback(
//       async (
//         currentUserId: string
//       ) => {
//         try {
//           setDiscoverLoading(
//             true
//           );

//           const {
//             data,
//             error:
//               groupsError,
//           } =
//             await supabase
//               .from("groups")
//               .select(
//                 `
//                   id,
//                   name,
//                   description,
//                   pool_amount,
//                   member_count,
//                   max_members,
//                   status,
//                   cycle_number,
//                   contribution_amount,
//                   next_due_date,
//                   next_payout_date,
//                   last_payout_date,
//                   created_at
//                 `
//               )
//               .neq(
//                 "status",
//                 "archived"
//               )
//               .order(
//                 "created_at",
//                 {
//                   ascending:
//                     false,
//                 }
//               )
//               .limit(100);

//           if (groupsError) {
//             console.error(
//               "Discover groups error:",
//               groupsError
//             );

//             setDiscoverGroups(
//               []
//             );

//             return;
//           }

//           const allGroups =
//             (data || []) as Group[];

//           /*
//            * Get the user's existing
//            * groups directly from the
//            * groups_members table.
//            *
//            * This avoids depending on
//            * myGroups state inside this
//            * function.
//            */
//           const {
//             data:
//               membershipData,
//             error:
//               membershipError,
//           } =
//             await supabase
//               .from(
//                 "group_members"
//               )
//               .select(
//                 "group_id"
//               )
//               .eq(
//                 "user_id",
//                 currentUserId
//               );

//           if (
//             membershipError
//           ) {
//             console.error(
//               "Discover membership lookup error:",
//               membershipError
//             );
//           }

//           const myGroupIds =
//             new Set(
//               (
//                 membershipData ||
//                 []
//               ).map(
//                 (item: any) =>
//                   item.group_id
//               )
//             );

//           /*
//            * Discover only active groups
//            * that the user doesn't already
//            * belong to.
//            */
//           const discoverable =
//             allGroups.filter(
//               (group) => {
//                 const status =
//                   String(
//                     group.status ||
//                       ""
//                   ).toLowerCase();

//                 return (
//                   !myGroupIds.has(
//                     group.id
//                   ) &&
//                   status ===
//                     "active"
//                 );
//               }
//             );

//           /*
//            * Attach real verification
//            * information.
//            */
//           const enriched =
//             await attachVerification(
//               discoverable
//             );

//           setDiscoverGroups(
//             enriched
//           );
//         } catch (err) {
//           console.error(
//             "loadDiscoverGroups:",
//             err
//           );

//           setDiscoverGroups(
//             []
//           );
//         } finally {
//           setDiscoverLoading(
//             false
//           );
//         }
//       },
//       [
//         supabase,
//         attachVerification,
//       ]
//     );

//   /* =======================================================
//      INITIAL LOAD
//   ======================================================= */

//   useEffect(() => {
//     let mounted = true;

//     async function initialise() {
//       if (!mounted) return;

//       setLoading(true);

//       await loadMyGroups();

//       if (mounted) {
//         setLoading(false);
//       }
//     }

//     initialise();

//     return () => {
//       mounted = false;
//     };
//   }, [
//     loadMyGroups,
//   ]);

//   /* =======================================================
//      LOAD DISCOVER AFTER MY GROUPS
//   ======================================================= */

//   useEffect(() => {
//     if (
//       !loading &&
//       userId
//     ) {
//       loadDiscoverGroups(
//         userId
//       );
//     }
//   }, [
//     loading,
//     userId,
//     loadDiscoverGroups,
//   ]);

//   /* =======================================================
//      REFRESH WHEN USER RETURNS
//   ======================================================= */

//   useEffect(() => {
//     const refresh =
//       () => {
//         loadMyGroups();
//       };

//     window.addEventListener(
//       "focus",
//       refresh
//     );

//     const visibilityHandler =
//       () => {
//         if (
//           document.visibilityState ===
//           "visible"
//         ) {
//           refresh();
//         }
//       };

//     document.addEventListener(
//       "visibilitychange",
//       visibilityHandler
//     );

//     return () => {
//       window.removeEventListener(
//         "focus",
//         refresh
//       );

//       document.removeEventListener(
//         "visibilitychange",
//         visibilityHandler
//       );
//     };
//   }, [
//     loadMyGroups,
//   ]);

//   /* =======================================================
//      DISCOVER FILTERING
//   ======================================================= */

//   const filteredDiscover =
//     useMemo(() => {
//       let result = [
//         ...discoverGroups,
//       ];

//       const query =
//         search
//           .trim()
//           .toLowerCase();

//       if (query) {
//         result =
//           result.filter(
//             (group) => {
//               const name =
//                 String(
//                   group.name ||
//                     ""
//                 ).toLowerCase();

//               const description =
//                 String(
//                   group.description ||
//                     ""
//                 ).toLowerCase();

//               const location =
//                 String(
//                   group.location ||
//                     ""
//                 ).toLowerCase();

//               return (
//                 name.includes(
//                   query
//                 ) ||
//                 description.includes(
//                   query
//                 ) ||
//                 location.includes(
//                   query
//                 )
//               );
//             }
//           );
//       }

//       if (
//         filter ===
//         "verified"
//       ) {
//         result =
//           result.filter(
//             isVerified
//           );
//       }

//       if (
//         filter ===
//         "active"
//       ) {
//         result =
//           result.filter(
//             (group) =>
//               String(
//                 group.status ||
//                   ""
//               ).toLowerCase() ===
//               "active"
//           );
//       }

//       /*
//        * Verified groups first.
//        */
//       result.sort(
//         (a, b) =>
//           Number(
//             isVerified(b)
//           ) -
//           Number(
//             isVerified(a)
//           )
//       );

//       return result;
//     }, [
//       discoverGroups,
//       search,
//       filter,
//     ]);

//   /* =======================================================
//      SUMMARY
//   ======================================================= */

//   const verifiedDiscoverCount =
//     discoverGroups.filter(
//       isVerified
//     ).length;

//   const activeDiscoverCount =
//     discoverGroups.filter(
//       (group) =>
//         String(
//           group.status ||
//             ""
//         ).toLowerCase() ===
//         "active"
//     ).length;

//   /* =======================================================
//      LOADING
//   ======================================================= */

//   if (loading) {
//     return (
//       <div className="groupsLoading">
//         <div className="loadingMark">
//           K
//         </div>

//         <div className="loadingTitle">
//           Loading your groups
//         </div>

//         <div className="loadingSub">
//           Preparing your Kolo community
//           view...
//         </div>

//         <style jsx>{`
//           .groupsLoading {
//             min-height: 65vh;
//             display: flex;
//             flex-direction: column;
//             align-items: center;
//             justify-content: center;
//             color: ${MUTED};
//             font-family:
//               Inter,
//               Geist,
//               system-ui,
//               sans-serif;
//           }

//           .loadingMark {
//             width: 56px;
//             height: 56px;
//             display: grid;
//             place-items: center;
//             margin-bottom: 20px;
//             border-radius: 16px;
//             background: ${GREEN};
//             color: white;
//             font-size: 24px;
//             font-weight: 850;
//             box-shadow:
//               0 12px 28px
//               rgba(0, 107, 44, .15);
//           }

//           .loadingTitle {
//             color: ${NAVY};
//             font-size: 20px;
//             font-weight: 750;
//           }

//           .loadingSub {
//             margin-top: 8px;
//             font-size: 14px;
//           }
//         `}</style>
//       </div>
//     );
//   }

//   /* =======================================================
//      PAGE
//   ======================================================= */

//   return (
//     <main className="groupsPage">

//       {/* TOP BAR */}

//       <header className="topbar">

//         <div className="breadcrumbs">
//           <span>
//             Directory
//           </span>

//           <span className="material-symbols-outlined">
//             chevron_right
//           </span>

//           <strong>
//             Groups
//           </strong>
//         </div>

//         <div className="searchBox">
//           <span className="material-symbols-outlined">
//             search
//           </span>

//           <input
//             value={search}
//             onChange={(event) =>
//               setSearch(
//                 event.target.value
//               )
//             }
//             placeholder="Search groups..."
//           />

//           {search && (
//             <button
//               type="button"
//               onClick={() =>
//                 setSearch("")
//               }
//               aria-label="Clear search"
//             >
//               close
//             </button>
//           )}
//         </div>

//         <button
//           type="button"
//           className="notificationButton"
//           aria-label="Notifications"
//         >
//           <span className="material-symbols-outlined">
//             notifications
//           </span>
//         </button>

//       </header>

//       {/* HERO */}

//       <section className="hero">

//         <div className="heroContent">

//           <div className="eyebrow">
//             KOLO COMMUNITY
//           </div>

//           <h1>
//             Savings groups
//           </h1>

//           <p>
//             Stay connected to the communities
//             you're saving with and discover
//             groups that may fit your savings
//             journey.
//           </p>

//         </div>

//         {isAdmin && (
//           <Link
//             href="/groups/create"
//             className="createButton"
//           >
//             <span className="material-symbols-outlined">
//               add
//             </span>

//             Create group
//           </Link>
//         )}

//       </section>

//       {/* ERROR */}

//       {error && (
//         <div className="errorBox">

//           <div className="errorIcon">
//             !
//           </div>

//           <span>
//             {error}
//           </span>

//           <button
//             type="button"
//             onClick={() => {
//               setError("");
//               loadMyGroups();
//             }}
//           >
//             Retry
//           </button>

//         </div>
//       )}

//       {/* TABS */}

//       <div className="tabs">

//         <button
//           type="button"
//           className={
//             tab === "mine"
//               ? "tab active"
//               : "tab"
//           }
//           onClick={() =>
//             setTab("mine")
//           }
//         >
//           <span className="material-symbols-outlined">
//             groups
//           </span>

//           <span>
//             My Groups
//           </span>

//           <b>
//             {myGroups.length}
//           </b>
//         </button>

//         <button
//           type="button"
//           className={
//             tab === "discover"
//               ? "tab active"
//               : "tab"
//           }
//           onClick={() =>
//             setTab("discover")
//           }
//         >
//           <span className="material-symbols-outlined">
//             explore
//           </span>

//           <span>
//             Discover
//           </span>

//           <b>
//             {discoverGroups.length}
//           </b>
//         </button>

//       </div>

//       {/* =====================================================
//           MY GROUPS
//       ===================================================== */}

//       {tab === "mine" && (
//         <section>

//           <div className="sectionHeader">

//             <div>

//               <div className="sectionEyebrow">
//                 YOUR COMMUNITY
//               </div>

//               <h2>
//                 Groups you belong to
//               </h2>

//               <p>
//                 Your active savings communities
//                 and their current status.
//               </p>

//             </div>

//             <button
//               type="button"
//               className="discoverButton"
//               onClick={() =>
//                 setTab("discover")
//               }
//             >
//               Discover groups

//               <span className="material-symbols-outlined">
//                 arrow_forward
//               </span>
//             </button>

//           </div>

//           {myGroups.length === 0 ? (
//             <EmptyGroups
//               isAdmin={isAdmin}
//               onDiscover={() =>
//                 setTab("discover")
//               }
//             />
//           ) : (
//             <div className="grid">

//               {myGroups.map(
//                 (group) => (
//                   <GroupCard
//                     key={group.id}
//                     group={group}
//                     mine
//                   />
//                 )
//               )}

//             </div>
//           )}

//         </section>
//       )}

//       {/* =====================================================
//           DISCOVER
//       ===================================================== */}

//       {tab === "discover" && (
//         <section>

//           <div className="discoverHeader">

//             <div className="discoverCopy">

//               <div className="sectionEyebrow">
//                 DISCOVER
//               </div>

//               <h2>
//                 Find a savings community
//               </h2>

//               <p>
//                 Explore active groups beyond
//                 the communities you already
//                 belong to. Review the group's
//                 information and Kolo trust
//                 status before making decisions.
//               </p>

//             </div>

//             <div className="discoverStats">

//               <div className="discoverStat">
//                 <strong>
//                   {discoverGroups.length}
//                 </strong>

//                 <span>
//                   Groups
//                 </span>
//               </div>

//               <div className="discoverDivider" />

//               <div className="discoverStat">
//                 <strong>
//                   {verifiedDiscoverCount}
//                 </strong>

//                 <span>
//                   Verified
//                 </span>
//               </div>

//               <div className="discoverDivider" />

//               <div className="discoverStat">
//                 <strong>
//                   {activeDiscoverCount}
//                 </strong>

//                 <span>
//                   Active
//                 </span>
//               </div>

//             </div>

//           </div>

//           {/* FILTERS */}

//           <div className="filters">

//             <button
//               type="button"
//               className={
//                 filter === "all"
//                   ? "filter active"
//                   : "filter"
//               }
//               onClick={() =>
//                 setFilter("all")
//               }
//             >
//               All groups
//             </button>

//             <button
//               type="button"
//               className={
//                 filter ===
//                 "verified"
//                   ? "filter active"
//                   : "filter"
//               }
//               onClick={() =>
//                 setFilter(
//                   "verified"
//                 )
//               }
//             >
//               <span className="material-symbols-outlined">
//                 verified
//               </span>

//               Kolo Verified
//             </button>

//             <button
//               type="button"
//               className={
//                 filter === "active"
//                   ? "filter active"
//                   : "filter"
//               }
//               onClick={() =>
//                 setFilter("active")
//               }
//             >
//               Active
//             </button>

//           </div>

//           {/* DISCOVER CONTENT */}

//           {discoverLoading ? (
//             <div className="discoverLoading">

//               <div className="spinner" />

//               <strong>
//                 Finding groups
//               </strong>

//               <span>
//                 Checking available communities...
//               </span>

//             </div>
//           ) : filteredDiscover.length ===
//             0 ? (
//             <div className="noResults">

//               <div className="noResultsIcon">
//                 <span className="material-symbols-outlined">
//                   search_off
//                 </span>
//               </div>

//               <h3>
//                 No groups found
//               </h3>

//               <p>
//                 Try a different search or
//                 filter. New communities will
//                 appear here when available.
//               </p>

//               {(search ||
//                 filter !== "all") && (
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setSearch("");
//                     setFilter("all");
//                   }}
//                 >
//                   Clear filters
//                 </button>
//               )}

//             </div>
//           ) : (
//             <div className="grid">

//               {filteredDiscover.map(
//                 (group) => (
//                   <GroupCard
//                     key={group.id}
//                     group={group}
//                   />
//                 )
//               )}

//             </div>
//           )}

//         </section>
//       )}

//       {/* TRUST NOTE */}

//       <div className="trustFooter">

//         <span className="material-symbols-outlined">
//           verified_user
//         </span>

//         <div>

//           <strong>
//             Understanding Kolo Verification
//           </strong>

//           <p>
//             Kolo Verified means the group's
//             submitted cooperative and
//             administrator information has
//             completed Kolo's review process.
//             It is a trust signal, not a guarantee
//             against financial loss.
//           </p>

//         </div>

//       </div>

//       <style jsx global>{`

//         * {
//           box-sizing: border-box;
//         }

//         .groupsPage {
//           width: 100%;
//           max-width: 1280px;
//           margin: 0 auto;
//           padding: 0 0 60px;
//           color: ${NAVY};

//           font-family:
//             Inter,
//             Geist,
//             system-ui,
//             -apple-system,
//             BlinkMacSystemFont,
//             "Segoe UI",
//             sans-serif;
//         }

//         /* TOPBAR */

//         .topbar {
//           min-height: 66px;
//           display: grid;

//           grid-template-columns:
//             1fr
//             minmax(280px, 440px)
//             1fr;

//           align-items: center;
//           gap: 20px;
//           margin-bottom: 42px;

//           border-bottom:
//             1px solid
//             rgba(189, 202, 186, .35);
//         }

//         .breadcrumbs {
//           display: flex;
//           align-items: center;
//           gap: 6px;

//           color: ${MUTED};
//           font-size: 14px;
//           font-weight: 600;
//         }

//         .breadcrumbs strong {
//           color: ${GREEN};
//         }

//         .breadcrumbs
//         .material-symbols-outlined {
//           font-size: 18px;
//         }

//         .searchBox {
//           position: relative;
//         }

//         .searchBox
//         > .material-symbols-outlined {
//           position: absolute;
//           left: 14px;
//           top: 50%;
//           transform:
//             translateY(-50%);

//           color: ${MUTED};
//           font-size: 20px;
//         }

//         .searchBox input {
//           width: 100%;
//           height: 44px;

//           padding:
//             0 40px
//             0 42px;

//           border:
//             1.5px solid
//             ${BORDER};

//           border-radius: 999px;
//           outline: none;

//           background: #f7f9f8;
//           color: ${NAVY};

//           font-family: inherit;
//           font-size: 14px;

//           transition: .18s ease;
//         }

//         .searchBox input:focus {
//           background: white;

//           border-color:
//             #9bc4a9;

//           box-shadow:
//             0 0 0 3px
//             ${GREEN_SOFT};
//         }

//         .searchBox button {
//           position: absolute;
//           right: 10px;
//           top: 50%;

//           transform:
//             translateY(-50%);

//           border: 0;
//           background: transparent;
//           color: ${MUTED};

//           cursor: pointer;

//           font-family:
//             "Material Symbols Outlined";

//           font-size: 20px;
//         }

//         .notificationButton {
//           justify-self: end;

//           width: 44px;
//           height: 44px;

//           display: grid;
//           place-items: center;

//           border:
//             1.5px solid
//             ${BORDER};

//           border-radius: 50%;

//           background: white;
//           color: ${GREEN};

//           cursor: pointer;
//         }

//         .notificationButton
//         .material-symbols-outlined {
//           font-size: 22px;
//         }

//         /* HERO */

//         .hero {
//           display: flex;
//           align-items: flex-end;
//           justify-content: space-between;

//           gap: 30px;
//           margin-bottom: 36px;
//         }

//         .heroContent {
//           max-width: 720px;
//         }

//         .eyebrow,
//         .sectionEyebrow {
//           color: ${GREEN};

//           font-size: 11px;
//           font-weight: 850;
//           letter-spacing: .16em;
//         }

//         .hero h1 {
//           margin:
//             12px 0 12px;

//           color: ${NAVY};

//           font-size: 40px;
//           line-height: 1;
//           letter-spacing: -.05em;
//           font-weight: 760;
//         }

//         .hero p {
//           max-width: 680px;

//           margin: 0;

//           color: ${TEXT};

//           font-size: 15px;
//           line-height: 1.7;
//         }

//         .createButton {
//           min-height: 48px;

//           display: inline-flex;
//           align-items: center;
//           justify-content: center;

//           gap: 8px;

//           padding:
//             0 22px;

//           border-radius: 999px;

//           background: ${GREEN};
//           color: white;

//           text-decoration: none;

//           font-size: 14px;
//           font-weight: 750;

//           white-space: nowrap;

//           transition:
//             transform .18s ease,
//             background .18s ease,
//             box-shadow .18s ease;
//         }

//         .createButton:hover {
//           background: ${GREEN_DARK};

//           transform:
//             translateY(-2px);

//           box-shadow:
//             0 12px 24px
//             rgba(0, 107, 44, .18);
//         }

//         .createButton
//         .material-symbols-outlined {
//           font-size: 22px;
//         }

//         /* ERROR */

//         .errorBox {
//           display: flex;
//           align-items: center;
//           gap: 12px;

//           margin-bottom: 20px;
//           padding: 14px 16px;

//           border:
//             1px solid
//             #eadfbd;

//           border-radius: 12px;

//           background: #fff8eb;
//           color: ${GOLD};

//           font-size: 13px;
//         }

//         .errorIcon {
//           width: 24px;
//           height: 24px;

//           display: grid;
//           place-items: center;

//           border-radius: 50%;

//           background: #f1e4bf;

//           font-weight: 800;
//         }

//         .errorBox button {
//           margin-left: auto;

//           border: 0;
//           background: transparent;

//           color: ${GOLD};

//           cursor: pointer;

//           font-family: inherit;
//           font-size: 13px;
//           font-weight: 800;
//         }

//         /* TABS */

//         .tabs {
//           display: flex;
//           align-items: center;
//           gap: 2px;

//           margin-bottom: 32px;

//           border-bottom:
//             1px solid
//             ${BORDER};
//         }

//         .tab {
//           min-height: 52px;

//           display: flex;
//           align-items: center;
//           gap: 8px;

//           padding:
//             0 18px;

//           margin-bottom: -1px;

//           border: 0;

//           border-bottom:
//             2px solid
//             transparent;

//           background: transparent;

//           color: ${MUTED};

//           cursor: pointer;

//           font-family: inherit;

//           font-size: 14px;
//           font-weight: 750;
//         }

//         .tab.active {
//           color: ${GREEN};

//           border-bottom-color:
//             ${GREEN};
//         }

//         .tab
//         .material-symbols-outlined {
//           font-size: 22px;
//         }

//         .tab b {
//           min-width: 24px;

//           padding:
//             4px 8px;

//           border-radius: 999px;

//           background:
//             #f0f3f1;

//           font-size: 12px;
//         }

//         .tab.active b {
//           background:
//             ${GREEN_SOFT};

//           color:
//             ${GREEN};
//         }

//         /* SECTION HEADER */

//         .sectionHeader {
//           display: flex;
//           align-items: flex-end;
//           justify-content: space-between;

//           gap: 20px;

//           margin-bottom: 20px;
//         }

//         .sectionHeader h2,
//         .discoverHeader h2 {
//           margin:
//             8px 0 8px;

//           color: ${NAVY};

//           font-size: 26px;
//           letter-spacing: -.035em;
//           font-weight: 760;
//         }

//         .sectionHeader p {
//           margin: 0;

//           color: ${MUTED};

//           font-size: 14px;
//         }

//         .discoverButton {
//           display: inline-flex;
//           align-items: center;
//           gap: 6px;

//           border: 0;
//           background: transparent;

//           color: ${GREEN};

//           cursor: pointer;

//           font-family: inherit;
//           font-size: 14px;
//           font-weight: 800;
//         }

//         .discoverButton
//         .material-symbols-outlined {
//           font-size: 20px;
//         }

//         /* DISCOVER HEADER */

//         .discoverHeader {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;

//           gap: 30px;

//           padding: 24px;
//           margin-bottom: 20px;

//           border:
//             1px solid
//             #dcebe1;

//           border-radius: 16px;

//           background:
//             linear-gradient(
//               135deg,
//               #f0f8f3,
//               #f8fbf9
//             );
//         }

//         .discoverCopy {
//           max-width: 650px;
//         }

//         .discoverHeader p {
//           margin: 0;

//           color: ${TEXT};

//           font-size: 14px;
//           line-height: 1.65;
//         }

//         .discoverStats {
//           display: flex;
//           align-items: center;

//           gap: 20px;

//           flex-shrink: 0;
//         }

//         .discoverStat {
//           display: flex;
//           flex-direction: column;

//           gap: 6px;
//         }

//         .discoverStat strong {
//           color: ${NAVY};

//           font-size: 24px;
//           line-height: 1;
//         }

//         .discoverStat span {
//           color: ${MUTED};

//           font-size: 12px;
//           font-weight: 700;
//         }

//         .discoverDivider {
//           width: 1px;
//           height: 36px;

//           background:
//             #d5e1d9;
//         }

//         /* FILTERS */

//         .filters {
//           display: flex;
//           align-items: center;

//           gap: 8px;

//           margin-bottom: 24px;
//         }

//         .filter {
//           display: inline-flex;
//           align-items: center;

//           gap: 6px;

//           padding:
//             10px 16px;

//           border:
//             1.5px solid
//             ${BORDER};

//           border-radius: 999px;

//           background: white;

//           color: ${MUTED};

//           cursor: pointer;

//           font-family: inherit;
//           font-size: 12px;
//           font-weight: 750;

//           transition:
//             .16s ease;
//         }

//         .filter:hover {
//           border-color:
//             #bfd2c5;
//         }

//         .filter.active {
//           border-color:
//             ${GREEN};

//           background:
//             ${GREEN};

//           color: white;
//         }

//         .filter
//         .material-symbols-outlined {
//           font-size: 16px;
//         }

//         /* GRID */

//         .grid {
//           display: grid;

//           grid-template-columns:
//             repeat(
//               3,
//               minmax(0, 1fr)
//             );

//           gap: 20px;
//         }

//         /* GROUP CARD */

//         .groupCardLink {
//           display: block;

//           height: 100%;

//           color: inherit;

//           text-decoration: none;
//         }

//         .groupCard {
//           height: 100%;

//           display: flex;
//           flex-direction: column;

//           gap: 14px;

//           padding: 20px;

//           border:
//             1px solid
//             ${BORDER};

//           border-radius: 16px;

//           background: white;

//           box-shadow:
//             0 5px 20px
//             rgba(
//               15,
//               23,
//               42,
//               .025
//             );

//           transition:
//             transform .18s ease,
//             box-shadow .18s ease,
//             border-color .18s ease;
//         }

//         .groupCard:hover {
//           transform:
//             translateY(-3px);

//           border-color:
//             #c6dacd;

//           box-shadow:
//             0 16px 36px
//             rgba(
//               15,
//               23,
//               42,
//               .08
//             );
//         }

//         .cardTop {
//           display: flex;
//           align-items: flex-start;
//           justify-content: space-between;

//           gap: 12px;
//         }

//         .identity {
//           min-width: 0;

//           display: flex;
//           align-items: center;

//           gap: 12px;
//         }

//         .groupIcon {
//           width: 48px;
//           height: 48px;

//           display: grid;
//           place-items: center;

//           flex: 0 0 auto;

//           border-radius: 14px;

//           background:
//             ${GREEN_SOFT};

//           color:
//             ${GREEN};
//         }

//         .groupIcon
//         .material-symbols-outlined {
//           font-size: 26px;
//         }

//         .identityText {
//           min-width: 0;
//         }

//         .identityText h3 {
//           margin:
//             0 0 6px;

//           overflow: hidden;

//           color: ${NAVY};

//           font-size: 16px;
//           font-weight: 760;

//           text-overflow:
//             ellipsis;

//           white-space:
//             nowrap;
//         }

//         .identityText span {
//           display: block;

//           max-width: 210px;

//           overflow: hidden;

//           color: ${MUTED};

//           font-size: 12px;
//           font-weight: 600;

//           text-overflow:
//             ellipsis;

//           white-space:
//             nowrap;
//         }

//         /* STATUS */

//         .status {
//           padding:
//             6px 10px;

//           border-radius: 999px;

//           font-size: 11px;
//           font-weight: 850;

//           white-space: nowrap;
//         }

//         .status.active {
//           background:
//             ${GREEN_SOFT};

//           color:
//             ${GREEN};
//         }

//         .status.other {
//           background:
//             #f1f3f2;

//           color:
//             ${MUTED};
//         }

//         /* VERIFICATION */

//         .verification {
//           min-height: 32px;

//           display: flex;
//           align-items: center;

//           gap: 6px;

//           padding:
//             0 12px;

//           border-radius: 10px;

//           background:
//             ${GREEN_SOFT};

//           color:
//             ${GREEN};

//           font-size: 12px;
//           font-weight: 800;
//         }

//         .verification.unverified {
//           background:
//             #f5f6f5;

//           color:
//             ${MUTED};
//         }

//         .verification
//         .material-symbols-outlined {
//           font-size: 18px;
//         }

//         /* INSIGHT */

//         .insight {
//           min-height: 48px;

//           padding: 12px;

//           border-radius: 10px;

//           background:
//             #fafcf9;

//           color: ${TEXT};

//           font-size: 12px;
//           line-height: 1.55;
//         }

//         .insight strong {
//           color:
//             ${GREEN};
//         }

//         /* STATS */

//         .stats {
//           display: grid;

//           grid-template-columns:
//             1fr 1fr;

//           gap: 14px;

//           padding:
//             14px 0;

//           border-top:
//             1px solid
//             #edf0ee;

//           border-bottom:
//             1px solid
//             #edf0ee;
//         }

//         .stat span {
//           display: block;

//           margin-bottom: 6px;

//           color: ${MUTED};

//           font-size: 10px;
//           font-weight: 800;

//           letter-spacing:
//             .04em;
//         }

//         .stat strong {
//           color:
//             ${NAVY};

//           font-size: 14px;
//           font-weight: 760;
//         }

//         .stat strong.money {
//           color:
//             ${GREEN};
//         }

//         /* CAPACITY */

//         .capacity {
//           padding-top: 2px;
//         }

//         .capacityHead {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;

//           margin-bottom: 8px;
//         }

//         .capacityHead span {
//           color: ${MUTED};

//           font-size: 10px;
//           font-weight: 800;
//         }

//         .capacityHead strong {
//           color: ${GREEN};

//           font-size: 12px;
//         }

//         .capacityBar {
//           width: 100%;
//           height: 5px;

//           overflow: hidden;

//           border-radius: 999px;

//           background:
//             #edf1ee;
//         }

//         .capacityFill {
//           height: 100%;

//           border-radius: inherit;

//           background:
//             ${GREEN};

//           transition:
//             width .4s ease;
//         }

//         /* FOOTER */

//         .cardBottom {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;

//           gap: 12px;

//           margin-top: auto;
//         }

//         .location {
//           min-width: 0;

//           display: flex;
//           align-items: center;

//           gap: 6px;

//           color: ${MUTED};

//           font-size: 12px;
//         }

//         .location
//         .material-symbols-outlined {
//           flex: 0 0 auto;

//           font-size: 18px;
//         }

//         .locationText {
//           overflow: hidden;

//           text-overflow:
//             ellipsis;

//           white-space:
//             nowrap;
//         }

//         .arrow {
//           width: 36px;
//           height: 36px;

//           display: grid;
//           place-items: center;

//           flex: 0 0 auto;

//           border-radius: 50%;

//           background:
//             ${NAVY};

//           color: white;
//         }

//         .arrow
//         .material-symbols-outlined {
//           font-size: 20px;
//         }

//         /* EMPTY */

//         .empty {
//           padding:
//             70px 24px;

//           border:
//             1.5px dashed
//             ${BORDER};

//           border-radius: 16px;

//           background: white;

//           text-align: center;
//         }

//         .emptyIcon {
//           width: 64px;
//           height: 64px;

//           display: grid;
//           place-items: center;

//           margin:
//             0 auto 16px;

//           border-radius: 18px;

//           background:
//             #f1f4f2;

//           color:
//             ${GREEN};
//         }

//         .emptyIcon
//         .material-symbols-outlined {
//           font-size: 32px;
//         }

//         .empty h3 {
//           margin:
//             0 0 8px;

//           color:
//             ${NAVY};

//           font-size: 22px;
//         }

//         .empty p {
//           max-width: 480px;

//           margin:
//             0 auto 24px;

//           color:
//             ${MUTED};

//           font-size: 14px;

//           line-height: 1.65;
//         }

//         .emptyActions {
//           display: flex;
//           align-items: center;
//           justify-content: center;

//           gap: 12px;
//         }

//         .emptyActions button,
//         .emptyActions a {
//           display: inline-flex;
//           align-items: center;
//           justify-content: center;

//           min-height: 44px;

//           padding:
//             0 18px;

//           border-radius: 12px;

//           font-family: inherit;
//           font-size: 13px;
//           font-weight: 800;

//           text-decoration: none;

//           cursor: pointer;
//         }

//         .emptyActions button {
//           border:
//             1.5px solid
//             ${BORDER};

//           background: white;

//           color:
//             ${GREEN};
//         }

//         .emptyActions a {
//           background:
//             ${GREEN};

//           color: white;
//         }

//         /* DISCOVER LOADING */

//         .discoverLoading {
//           min-height: 280px;

//           display: flex;
//           flex-direction: column;

//           align-items: center;
//           justify-content: center;

//           gap: 10px;

//           border:
//             1px solid
//             ${BORDER};

//           border-radius: 16px;

//           background: white;

//           color: ${MUTED};

//           font-size: 14px;
//         }

//         .discoverLoading strong {
//           color: ${NAVY};

//           font-size: 16px;
//         }

//         .spinner {
//           width: 32px;
//           height: 32px;

//           margin-bottom: 8px;

//           border:
//             3px solid
//             #e5ece7;

//           border-top-color:
//             ${GREEN};

//           border-radius: 50%;

//           animation:
//             groupSpin .7s
//             linear infinite;
//         }

//         @keyframes groupSpin {
//           to {
//             transform:
//               rotate(360deg);
//           }
//         }

//         /* NO RESULTS */

//         .noResults {
//           min-height: 300px;

//           display: flex;
//           flex-direction: column;

//           align-items: center;
//           justify-content: center;

//           padding: 40px;

//           border:
//             1px solid
//             ${BORDER};

//           border-radius: 16px;

//           background: white;

//           text-align: center;
//         }

//         .noResultsIcon {
//           width: 56px;
//           height: 56px;

//           display: grid;
//           place-items: center;

//           border-radius: 16px;

//           background:
//             #f2f5f3;

//           color:
//             ${MUTED};
//         }

//         .noResultsIcon
//         .material-symbols-outlined {
//           font-size: 28px;
//         }

//         .noResults h3 {
//           margin:
//             16px 0 8px;

//           color:
//             ${NAVY};

//           font-size: 20px;
//         }

//         .noResults p {
//           max-width: 440px;

//           margin: 0;

//           color:
//             ${MUTED};

//           font-size: 13px;

//           line-height: 1.65;
//         }

//         .noResults button {
//           margin-top: 20px;

//           min-height: 40px;

//           padding:
//             0 16px;

//           border:
//             1.5px solid
//             ${BORDER};

//           border-radius: 10px;

//           background: white;

//           color:
//             ${GREEN};

//           cursor: pointer;

//           font-family: inherit;

//           font-size: 13px;
//           font-weight: 800;
//         }

//         /* TRUST FOOTER */

//         .trustFooter {
//           display: flex;
//           align-items: flex-start;

//           gap: 12px;

//           max-width: 800px;

//           margin-top: 36px;

//           padding: 16px;

//           border-radius: 12px;

//           background:
//             #f7faf8;
//         }

//         .trustFooter
//         > .material-symbols-outlined {
//           flex: 0 0 auto;

//           color:
//             ${GREEN};

//           font-size: 22px;
//         }

//         .trustFooter strong {
//           display: block;

//           margin-bottom: 6px;

//           color:
//             ${NAVY};

//           font-size: 13px;
//         }

//         .trustFooter p {
//           margin: 0;

//           color:
//             ${MUTED};

//           font-size: 12px;

//           line-height: 1.65;
//         }

//         /* RESPONSIVE */

//         @media (max-width: 1050px) {
//           .grid {
//             grid-template-columns:
//               repeat(
//                 2,
//                 minmax(0, 1fr)
//               );
//           }
//         }

//         @media (max-width: 760px) {
//           .groupsPage {
//             padding:
//               0 14px 45px;
//           }

//           .topbar {
//             grid-template-columns:
//               1fr auto;

//             gap: 12px;

//             margin-bottom:
//               30px;
//           }

//           .searchBox {
//             grid-column:
//               1 / -1;

//             grid-row: 2;
//           }

//           .hero {
//             align-items:
//               flex-start;

//             flex-direction:
//               column;
//           }

//           .createButton {
//             width: 100%;
//           }

//           .grid {
//             grid-template-columns:
//               1fr;
//           }

//           .discoverHeader {
//             align-items:
//               flex-start;

//             flex-direction:
//               column;
//           }

//           .discoverStats {
//             width: 100%;
//           }
//         }

//         @media (max-width: 480px) {
//           .hero h1 {
//             font-size: 32px;
//           }

//           .sectionHeader {
//             align-items:
//               flex-start;

//             flex-direction:
//               column;
//           }

//           .discoverButton {
//             padding: 0;
//           }

//           .tabs {
//             width: 100%;
//           }

//           .tab {
//             flex: 1;

//             justify-content:
//               center;
//           }

//           .tab
//           .material-symbols-outlined {
//             display: none;
//           }

//           .filters {
//             overflow-x: auto;

//             flex-wrap:
//               nowrap;

//             padding-bottom: 3px;
//           }

//           .filter {
//             flex-shrink: 0;

//             white-space:
//               nowrap;
//           }

//           .discoverStats {
//             justify-content:
//               space-between;
//           }

//           .discoverDivider {
//             height: 24px;
//           }

//           .status {
//             display: none;
//           }
//         }

//       `}</style>
//     </main>
//   );
// }

// /* =========================================================
//    GROUP CARD
// ========================================================= */

// function GroupCard({
//   group,
//   mine = false,
// }: {
//   group: Group;
//   mine?: boolean;
// }) {
//   const verified =
//     isVerified(group);

//   const members =
//     numberValue(
//       group.member_count
//     );

//   const maximum =
//     numberValue(
//       group.max_members
//     ) || 20;

//   const pool =
//     numberValue(
//       group.pool_amount
//     );

//   const contribution =
//     numberValue(
//       group.contribution_amount
//     );

//   const capacity =
//     maximum > 0
//       ? Math.min(
//           100,
//           Math.round(
//             (members /
//               maximum) *
//               100
//           )
//         )
//       : 0;

//   const status =
//     String(
//       group.status ||
//         "active"
//     );

//   const location =
//     group.location ||
//     group.city ||
//     group.state ||
//     "Location not provided";

//   /* =======================================================
//      INTELLIGENCE
//   ======================================================= */

//   let insight =
//     "Review the group's details before making a decision.";

//   if (verified) {
//     if (members >= 10) {
//       insight =
//         "Kolo Verified · This is an established group with a strong member base.";
//     } else if (
//       capacity >= 80
//     ) {
//       insight =
//         "Kolo Verified · The group is close to its stated membership capacity.";
//     } else {
//       insight =
//         "Kolo Verified · The group's submitted cooperative information has completed Kolo review.";
//     }
//   } else if (
//     status.toLowerCase() ===
//     "active"
//   ) {
//     insight =
//       "Active group · Check its Kolo verification status and group details before committing funds.";
//   }

//   if (
//     members >= maximum &&
//     maximum > 0
//   ) {
//     insight = verified
//       ? "Kolo Verified · The group has reached its stated member capacity."
//       : "The group has reached its stated member capacity.";
//   }

//   return (
//     <Link
//       href={`/groups/${group.id}`}
//       className="groupCardLink"
//     >
//       <article className="groupCard">

//         {/* TOP */}

//         <div className="cardTop">

//           <div className="identity">

//             <div className="groupIcon">
//               <span className="material-symbols-outlined">
//                 account_balance
//               </span>
//             </div>

//             <div className="identityText">

//               <h3>
//                 {group.name}
//               </h3>

//               <span>
//                 {group.description ||
//                   "Savings community"}
//               </span>

//             </div>

//           </div>

//           <span
//             className={
//               status.toLowerCase() ===
//               "active"
//                 ? "status active"
//                 : "status other"
//             }
//           >
//             {status}
//           </span>

//         </div>

//         {/* VERIFICATION */}

//         <div
//           className={
//             verified
//               ? "verification"
//               : "verification unverified"
//           }
//         >

//           <span className="material-symbols-outlined">
//             {verified
//               ? "verified"
//               : "help_outline"}
//           </span>

//           {verified
//             ? "Kolo Verified"
//             : "Not Kolo Verified"}

//         </div>

//         {/* INSIGHT */}

//         <div className="insight">

//           <strong>
//             Kolo insight:
//           </strong>{" "}

//           {insight}

//         </div>

//         {/* STATS */}

//         <div className="stats">

//           <div className="stat">

//             <span>
//               MEMBERS
//             </span>

//             <strong>
//               {members}
//               {" / "}
//               {maximum}
//             </strong>

//           </div>

//           <div className="stat">

//             <span>
//               CONTRIBUTION
//             </span>

//             <strong className="money">
//               {contribution > 0
//                 ? formatNaira(
//                     contribution
//                   )
//                 : "Not specified"}
//             </strong>

//           </div>

//           <div className="stat">

//             <span>
//               CURRENT POOL
//             </span>

//             <strong className="money">
//               {formatNaira(
//                 pool
//               )}
//             </strong>

//           </div>

//           <div className="stat">

//             <span>
//               CYCLE
//             </span>

//             <strong>
//               {group.cycle_number
//                 ? `Cycle ${group.cycle_number}`
//                 : "Current"}
//             </strong>

//           </div>

//         </div>

//         {/* CAPACITY */}

//         <div className="capacity">

//           <div className="capacityHead">

//             <span>
//               GROUP CAPACITY
//             </span>

//             <strong>
//               {capacity}%
//             </strong>

//           </div>

//           <div className="capacityBar">

//             <div
//               className="capacityFill"
//               style={{
//                 width:
//                   `${capacity}%`,
//               }}
//             />

//           </div>

//         </div>

//         {/* FOOTER */}

//         <div className="cardBottom">

//           <div className="location">

//             <span className="material-symbols-outlined">
//               location_on
//             </span>

//             <span className="locationText">
//               {location}
//             </span>

//           </div>

//           <div className="arrow">

//             <span className="material-symbols-outlined">
//               arrow_forward
//             </span>

//           </div>

//         </div>

//       </article>
//     </Link>
//   );
// }

// /* =========================================================
//    EMPTY STATE
// ========================================================= */

// function EmptyGroups({
//   isAdmin,
//   onDiscover,
// }: {
//   isAdmin: boolean;
//   onDiscover: () => void;
// }) {
//   return (
//     <div className="empty">

//       <div className="emptyIcon">

//         <span className="material-symbols-outlined">
//           groups
//         </span>

//       </div>

//       <h3>
//         You haven't joined a group yet
//       </h3>

//       <p>
//         Explore other savings communities
//         or create a group if you're an
//         authorized Kolo administrator.
//       </p>

//       <div className="emptyActions">

//         <button
//           type="button"
//           onClick={onDiscover}
//         >
//           Explore groups
//         </button>

//         {isAdmin && (
//           <Link
//             href="/groups/create"
//           >
//             Create group
//           </Link>
//         )}

//       </div>

//     </div>
//   );
// }


// // "use client";

// // import Link from "next/link";
// // import {
// //   useCallback,
// //   useEffect,
// //   useMemo,
// //   useState,
// // } from "react";

// // import { createClient } from "@/lib/supabase/client";

// // /* =========================================================
// //    TYPES
// // ========================================================= */

// // type Group = {
// //   verification_status: string;
// //   verified_at(verified_at: any): boolean;
// //   id: string;
// //   name: string;
// //   description?: string | null;

// //   pool_amount?: number | string | null;
// //   member_count?: number | string | null;
// //   max_members?: number | string | null;

// //   status?: string | null;
// //   cycle_number?: number | string | null;

// //   contribution_amount?: number | string | null;

// //   next_due_date?: string | null;
// //   next_payout_date?: string | null;
// //   last_payout_date?: string | null;

// //   location?: string | null;
// //   city?: string | null;
// //   state?: string | null;

// //   created_at?: string | null;
// // };

// // type Membership = {
// //   group_id: string;
// //   role?: string | null;
// //   groups: Group | null;
// // };

// // type Verification = {
// //   group_id: string;
// //   status?: string | null;
// //   verified_at?: string | null;
// //   cooperative_location?: string | null;
// // };

// // type Tab = "mine" | "discover";
// // type Filter = "all" | "verified" | "active";

// // /* =========================================================
// //    CONSTANTS
// // ========================================================= */

// // const GREEN = "#006b2c";
// // const GREEN_DARK = "#005522";
// // const GREEN_SOFT = "#edf7f0";

// // const NAVY = "#0b1c30";
// // const TEXT = "#3e4a3d";
// // const MUTED = "#6e7b6c";

// // const BORDER = "#e4e9e6";
// // const GOLD = "#825100";

// // /* =========================================================
// //    HELPERS
// // ========================================================= */

// // function formatNaira(value: number | string | null | undefined) {
// //   const amount = Number(value || 0);

// //   return `₦${amount.toLocaleString("en-NG", {
// //     maximumFractionDigits: 0,
// //   })}`;
// // }

// // function numberValue(value: number | string | null | undefined) {
// //   return Number(value || 0);
// // }

// // function isVerified(group: Group) {
// //   return (
// //     String(group.verification_status || "").toLowerCase() ===
// //       "verified" ||
// //     Boolean(group.verified_at)
// //   );
// // }

// // /* =========================================================
// //    PAGE
// // ========================================================= */

// // export default function GroupsPage() {
// //   const supabase = createClient();

// //   const [userId, setUserId] = useState<string>("");

// //   const [myGroups, setMyGroups] = useState<Group[]>([]);
// //   const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);

// //   const [loading, setLoading] = useState(true);
// //   const [discoverLoading, setDiscoverLoading] = useState(true);

// //   const [isAdmin, setIsAdmin] = useState(false);

// //   const [tab, setTab] = useState<Tab>("mine");
// //   const [filter, setFilter] = useState<Filter>("all");
// //   const [search, setSearch] = useState("");

// //   const [error, setError] = useState("");

// //   /* =======================================================
// //      VERIFICATION ENRICHMENT
// //   ======================================================= */

// //   const attachVerification = useCallback(
// //     async (groups: Group[]) => {
// //       if (!groups.length) return groups;

// //       const ids = groups.map((group) => group.id);

// //       const { data, error: verificationError } =
// //         await supabase
// //           .from("verification_submissions")
// //           .select(
// //             `
// //               group_id,
// //               status,
// //               verified_at,
// //               cooperative_location
// //             `
// //           )
// //           .in("group_id", ids)
// //           .order("verified_at", {
// //             ascending: false,
// //           });

// //       if (verificationError) {
// //         console.warn(
// //           "Verification lookup:",
// //           verificationError.message
// //         );

// //         return groups;
// //       }

// //       const verificationMap = new Map<
// //         string,
// //         Verification
// //       >();

// //       (data || []).forEach((item) => {
// //         const verification =
// //           item as Verification;

// //         if (!verificationMap.has(verification.group_id)) {
// //           verificationMap.set(
// //             verification.group_id,
// //             verification
// //           );
// //         }
// //       });

// //       return groups.map((group) => {
// //         const verification =
// //           verificationMap.get(group.id);

// //         return {
// //           ...group,

// //           verification_status:
// //             verification?.status || null,

// //           verified_at:
// //             verification?.verified_at || null,

// //           location:
// //             group.location ||
// //             group.city ||
// //             group.state ||
// //             verification?.cooperative_location ||
// //             null,
// //         };
// //       });
// //     },
// //     [supabase]
// //   );

// //   /* =======================================================
// //      LOAD CURRENT USER + MY GROUPS
// //   ======================================================= */

// //   const loadMyGroups = useCallback(async () => {
// //     try {
// //       setError("");

// //       const {
// //         data: { user },
// //       } = await supabase.auth.getUser();

// //       if (!user) {
// //         window.location.href = "/login";
// //         return;
// //       }

// //       setUserId(user.id);

// //       const {
// //         data,
// //         error: membershipError,
// //       } = await supabase
// //         .from("group_members")
// //         .select(
// //           `
// //             group_id,
// //             role,
// //             groups(*)
// //           `
// //         )
// //         .eq("user_id", user.id);

// //       if (membershipError) {
// //         console.error(
// //           "Group membership error:",
// //           membershipError
// //         );

// //         setError(
// //           "We couldn't load your groups. Please try again."
// //         );

// //         return;
// //       }

// //       const memberships =
// //         (data || []) as unknown as Membership[];

// //       const groups = memberships
// //         .map((item) => item.groups)
// //         .filter(Boolean) as Group[];

// //       const enriched =
// //         await attachVerification(groups);

// //       setMyGroups(enriched);

// //       const admin =
// //         memberships.some((membership) => {
// //           const role =
// //             String(
// //               membership.role || ""
// //             ).toLowerCase();

// //           return [
// //             "admin",
// //             "administrator",
// //             "owner",
// //             "treasurer",
// //           ].includes(role);
// //         });

// //       setIsAdmin(admin);
// //     } catch (err) {
// //       console.error(
// //         "loadMyGroups:",
// //         err
// //       );

// //       setError(
// //         "Something went wrong while loading your groups."
// //       );
// //     }
// //   }, [
// //     supabase,
// //     attachVerification,
// //   ]);

// //   /* =======================================================
// //      LOAD DISCOVERABLE GROUPS
// //   ======================================================= */

// //   const loadDiscoverGroups = useCallback(
// //     async (currentUserId: string) => {
// //       try {
// //         setDiscoverLoading(true);

// //         const {
// //           data,
// //           error: groupsError,
// //         } = await supabase
// //           .from("groups")
// //           .select(
// //             `
// //               id,
// //               name,
// //               description,
// //               pool_amount,
// //               member_count,
// //               max_members,
// //               status,
// //               cycle_number,
// //               contribution_amount,
// //               next_due_date,
// //               next_payout_date,
// //               last_payout_date,
// //               created_at
// //             `
// //           )
// //           .neq("status", "archived")
// //           .order("created_at", {
// //             ascending: false,
// //           })
// //           .limit(100);

// //         if (groupsError) {
// //           console.error(
// //             "Discover groups error:",
// //             groupsError
// //           );

// //           setDiscoverGroups([]);

// //           return;
// //         }

// //         const allGroups =
// //           (data || []) as Group[];

// //         const myGroupIds =
// //           new Set(
// //             myGroups.map(
// //               (group) => group.id
// //             )
// //           );

// //         const discoverable =
// //           allGroups.filter((group) => {
// //             const status =
// //               String(
// //                 group.status || ""
// //               ).toLowerCase();

// //             return (
// //               !myGroupIds.has(group.id) &&
// //               status === "active"
// //             );
// //           });

// //         const enriched =
// //           await attachVerification(
// //             discoverable
// //           );

// //         setDiscoverGroups(enriched);
// //       } catch (err) {
// //         console.error(
// //           "loadDiscoverGroups:",
// //           err
// //         );

// //         setDiscoverGroups([]);
// //       } finally {
// //         setDiscoverLoading(false);
// //       }
// //     },
// //     [
// //       supabase,
// //       myGroups,
// //       attachVerification,
// //     ]
// //   );

// //   /* =======================================================
// //      INITIAL LOAD
// //   ======================================================= */

// //   useEffect(() => {
// //     let mounted = true;

// //     async function initialise() {
// //       if (!mounted) return;

// //       setLoading(true);

// //       await loadMyGroups();

// //       if (mounted) {
// //         setLoading(false);
// //       }
// //     }

// //     initialise();

// //     return () => {
// //       mounted = false;
// //     };
// //   }, [loadMyGroups]);

// //   /* =======================================================
// //      LOAD DISCOVER AFTER MY GROUPS
// //   ======================================================= */

// //   useEffect(() => {
// //     if (!loading && userId) {
// //       loadDiscoverGroups(userId);
// //     }
// //   }, [
// //     loading,
// //     userId,
// //     myGroups,
// //     loadDiscoverGroups,
// //   ]);

// //   /* =======================================================
// //      REFRESH WHEN USER RETURNS TO PAGE
// //   ======================================================= */

// //   useEffect(() => {
// //     const refresh = () => {
// //       loadMyGroups();
// //     };

// //     window.addEventListener(
// //       "focus",
// //       refresh
// //     );

// //     const visibilityHandler = () => {
// //       if (
// //         document.visibilityState ===
// //         "visible"
// //       ) {
// //         refresh();
// //       }
// //     };

// //     document.addEventListener(
// //       "visibilitychange",
// //       visibilityHandler
// //     );

// //     return () => {
// //       window.removeEventListener(
// //         "focus",
// //         refresh
// //       );

// //       document.removeEventListener(
// //         "visibilitychange",
// //         visibilityHandler
// //       );
// //     };
// //   }, [loadMyGroups]);

// //   /* =======================================================
// //      DISCOVER FILTERING
// //   ======================================================= */

// //   const filteredDiscover =
// //     useMemo(() => {
// //       let result = [
// //         ...discoverGroups,
// //       ];

// //       const query =
// //         search.trim().toLowerCase();

// //       if (query) {
// //         result = result.filter(
// //           (group) => {
// //             const name =
// //               String(
// //                 group.name || ""
// //               ).toLowerCase();

// //             const description =
// //               String(
// //                 group.description || ""
// //               ).toLowerCase();

// //             return (
// //               name.includes(query) ||
// //               description.includes(query)
// //             );
// //           }
// //         );
// //       }

// //       if (filter === "verified") {
// //         result =
// //           result.filter(
// //             isVerified
// //           );
// //       }

// //       if (filter === "active") {
// //         result =
// //           result.filter(
// //             (group) =>
// //               String(
// //                 group.status || ""
// //               ).toLowerCase() ===
// //               "active"
// //           );
// //       }

// //       result.sort(
// //         (a, b) =>
// //           Number(
// //             isVerified(b)
// //           ) -
// //           Number(
// //             isVerified(a)
// //           )
// //       );

// //       return result;
// //     }, [
// //       discoverGroups,
// //       search,
// //       filter,
// //     ]);

// //   /* =======================================================
// //      SUMMARY
// //   ======================================================= */

// //   const verifiedDiscoverCount =
// //     discoverGroups.filter(
// //       isVerified
// //     ).length;

// //   const activeDiscoverCount =
// //     discoverGroups.filter(
// //       (group) =>
// //         String(
// //           group.status || ""
// //         ).toLowerCase() ===
// //         "active"
// //     ).length;

// //   /* =======================================================
// //      LOADING
// //   ======================================================= */

// //   if (loading) {
// //     return (
// //       <div className="groupsLoading">
// //         <div className="loadingMark">
// //           K
// //         </div>

// //         <div className="loadingTitle">
// //           Loading your groups
// //         </div>

// //         <div className="loadingSub">
// //           Preparing your Kolo community view...
// //         </div>

// //         <style jsx>{`
// //           .groupsLoading {
// //             min-height: 65vh;
// //             display: flex;
// //             flex-direction: column;
// //             align-items: center;
// //             justify-content: center;
// //             color: ${MUTED};
// //             font-family:
// //               Inter,
// //               Geist,
// //               system-ui,
// //               sans-serif;
// //           }

// //           .loadingMark {
// //             width: 56px;
// //             height: 56px;
// //             display: grid;
// //             place-items: center;
// //             margin-bottom: 20px;
// //             border-radius: 16px;
// //             background: ${GREEN};
// //             color: white;
// //             font-size: 24px;
// //             font-weight: 850;
// //             box-shadow:
// //               0 12px 28px
// //               rgba(0, 107, 44, .15);
// //           }

// //           .loadingTitle {
// //             color: ${NAVY};
// //             font-size: 20px;
// //             font-weight: 750;
// //           }

// //           .loadingSub {
// //             margin-top: 8px;
// //             font-size: 14px;
// //           }
// //         `}</style>
// //       </div>
// //     );
// //   }

// //   /* =======================================================
// //      PAGE
// //   ======================================================= */

// //   return (
// //     <main className="groupsPage">

// //       {/* TOP BAR */}

// //       <header className="topbar">

// //         <div className="breadcrumbs">
// //           <span>Directory</span>

// //           <span className="material-symbols-outlined">
// //             chevron_right
// //           </span>

// //           <strong>Groups</strong>
// //         </div>

// //         <div className="searchBox">

// //           <span className="material-symbols-outlined">
// //             search
// //           </span>

// //           <input
// //             value={search}
// //             onChange={(event) =>
// //               setSearch(
// //                 event.target.value
// //               )
// //             }
// //             placeholder="Search groups..."
// //           />

// //           {search && (
// //             <button
// //               type="button"
// //               onClick={() =>
// //                 setSearch("")
// //               }
// //               aria-label="Clear search"
// //             >
// //               close
// //             </button>
// //           )}

// //         </div>

// //         <button
// //           type="button"
// //           className="notificationButton"
// //           aria-label="Notifications"
// //         >
// //           <span className="material-symbols-outlined">
// //             notifications
// //           </span>
// //         </button>

// //       </header>


// //       {/* HERO */}

// //       <section className="hero">

// //         <div className="heroContent">

// //           <div className="eyebrow">
// //             KOLO COMMUNITY
// //           </div>

// //           <h1>
// //             Savings groups
// //           </h1>

// //           <p>
// //             Stay connected to the communities
// //             you're saving with and discover
// //             groups that may fit your savings
// //             journey.
// //           </p>

// //         </div>

// //         {isAdmin && (
// //           <Link
// //             href="/groups/create"
// //             className="createButton"
// //           >
// //             <span className="material-symbols-outlined">
// //               add
// //             </span>

// //             Create group
// //           </Link>
// //         )}

// //       </section>


// //       {/* ERROR */}

// //       {error && (
// //         <div className="errorBox">
// //           <div className="errorIcon">
// //             !
// //           </div>

// //           <span>
// //             {error}
// //           </span>

// //           <button
// //             type="button"
// //             onClick={() => {
// //               setError("");
// //               loadMyGroups();
// //             }}
// //           >
// //             Retry
// //           </button>
// //         </div>
// //       )}


// //       {/* TABS */}

// //       <div className="tabs">

// //         <button
// //           type="button"
// //           className={
// //             tab === "mine"
// //               ? "tab active"
// //               : "tab"
// //           }
// //           onClick={() =>
// //             setTab("mine")
// //           }
// //         >
// //           <span className="material-symbols-outlined">
// //             groups
// //           </span>

// //           <span>
// //             My Groups
// //           </span>

// //           <b>
// //             {myGroups.length}
// //           </b>
// //         </button>


// //         <button
// //           type="button"
// //           className={
// //             tab === "discover"
// //               ? "tab active"
// //               : "tab"
// //           }
// //           onClick={() =>
// //             setTab("discover")
// //           }
// //         >
// //           <span className="material-symbols-outlined">
// //             explore
// //           </span>

// //           <span>
// //             Discover
// //           </span>

// //           <b>
// //             {discoverGroups.length}
// //           </b>
// //         </button>

// //       </div>


// //       {/* =====================================================
// //           MY GROUPS
// //       ===================================================== */}

// //       {tab === "mine" && (
// //         <section>

// //           <div className="sectionHeader">

// //             <div>
// //               <div className="sectionEyebrow">
// //                 YOUR COMMUNITY
// //               </div>

// //               <h2>
// //                 Groups you belong to
// //               </h2>

// //               <p>
// //                 Your active savings communities
// //                 and their current status.
// //               </p>
// //             </div>

// //             <button
// //               type="button"
// //               className="discoverButton"
// //               onClick={() =>
// //                 setTab("discover")
// //               }
// //             >
// //               Discover groups

// //               <span className="material-symbols-outlined">
// //                 arrow_forward
// //               </span>
// //             </button>

// //           </div>


// //           {myGroups.length === 0 ? (
// //             <EmptyGroups
// //               isAdmin={isAdmin}
// //               onDiscover={() =>
// //                 setTab("discover")
// //               }
// //             />
// //           ) : (

// //             <div className="grid">

// //               {myGroups.map(
// //                 (group) => (
// //                   <GroupCard
// //                     key={group.id}
// //                     group={group}
// //                     mine
// //                   />
// //                 )
// //               )}

// //             </div>

// //           )}

// //         </section>
// //       )}


// //       {/* =====================================================
// //           DISCOVER
// //       ===================================================== */}

// //       {tab === "discover" && (
// //         <section>

// //           <div className="discoverHeader">

// //             <div className="discoverCopy">

// //               <div className="sectionEyebrow">
// //                 DISCOVER
// //               </div>

// //               <h2>
// //                 Find a savings community
// //               </h2>

// //               <p>
// //                 Explore active groups beyond
// //                 the communities you already
// //                 belong to. Review the group's
// //                 information and Kolo trust
// //                 status before making decisions.
// //               </p>

// //             </div>


// //             <div className="discoverStats">

// //               <div className="discoverStat">
// //                 <strong>
// //                   {discoverGroups.length}
// //                 </strong>

// //                 <span>
// //                   Groups
// //                 </span>
// //               </div>

// //               <div className="discoverDivider" />

// //               <div className="discoverStat">
// //                 <strong>
// //                   {verifiedDiscoverCount}
// //                 </strong>

// //                 <span>
// //                   Verified
// //                 </span>
// //               </div>

// //               <div className="discoverDivider" />

// //               <div className="discoverStat">
// //                 <strong>
// //                   {activeDiscoverCount}
// //                 </strong>

// //                 <span>
// //                   Active
// //                 </span>
// //               </div>

// //             </div>

// //           </div>


// //           {/* FILTERS */}

// //           <div className="filters">

// //             <button
// //               type="button"
// //               className={
// //                 filter === "all"
// //                   ? "filter active"
// //                   : "filter"
// //               }
// //               onClick={() =>
// //                 setFilter("all")
// //               }
// //             >
// //               All groups
// //             </button>

// //             <button
// //               type="button"
// //               className={
// //                 filter === "verified"
// //                   ? "filter active"
// //                   : "filter"
// //               }
// //               onClick={() =>
// //                 setFilter("verified")
// //               }
// //             >
// //               <span className="material-symbols-outlined">
// //                 verified
// //               </span>

// //               Kolo Verified
// //             </button>

// //             <button
// //               type="button"
// //               className={
// //                 filter === "active"
// //                   ? "filter active"
// //                   : "filter"
// //               }
// //               onClick={() =>
// //                 setFilter("active")
// //               }
// //             >
// //               Active
// //             </button>

// //           </div>


// //           {/* DISCOVER CONTENT */}

// //           {discoverLoading ? (

// //             <div className="discoverLoading">

// //               <div className="spinner" />

// //               <strong>
// //                 Finding groups
// //               </strong>

// //               <span>
// //                 Checking available communities...
// //               </span>

// //             </div>

// //           ) : filteredDiscover.length === 0 ? (

// //             <div className="noResults">

// //               <div className="noResultsIcon">
// //                 <span className="material-symbols-outlined">
// //                   search_off
// //                 </span>
// //               </div>

// //               <h3>
// //                 No groups found
// //               </h3>

// //               <p>
// //                 Try a different search or
// //                 filter. New communities will
// //                 appear here when available.
// //               </p>

// //               {(search ||
// //                 filter !== "all") && (
// //                 <button
// //                   type="button"
// //                   onClick={() => {
// //                     setSearch("");
// //                     setFilter("all");
// //                   }}
// //                 >
// //                   Clear filters
// //                 </button>
// //               )}

// //             </div>

// //           ) : (

// //             <div className="grid">

// //               {filteredDiscover.map(
// //                 (group) => (
// //                   <GroupCard
// //                     key={group.id}
// //                     group={group}
// //                   />
// //                 )
// //               )}

// //             </div>

// //           )}

// //         </section>
// //       )}


// //       {/* TRUST NOTE */}

// //       <div className="trustFooter">

// //         <span className="material-symbols-outlined">
// //           verified_user
// //         </span>

// //         <div>

// //           <strong>
// //             Understanding Kolo Verification
// //           </strong>

// //           <p>
// //             Kolo Verified means the group's
// //             submitted cooperative and
// //             administrator information has
// //             completed Kolo's review process.
// //             It is a trust signal, not a guarantee
// //             against financial loss.
// //           </p>

// //         </div>

// //       </div>


// //       <style jsx global>{`

// //         * {
// //           box-sizing: border-box;
// //         }

// //         .groupsPage {
// //           width: 100%;
// //           max-width: 1280px;
// //           margin: 0 auto;
// //           padding: 0 0 60px;

// //           color: ${NAVY};

// //           font-family:
// //             Inter,
// //             Geist,
// //             system-ui,
// //             -apple-system,
// //             BlinkMacSystemFont,
// //             "Segoe UI",
// //             sans-serif;
// //         }


// //         /* =====================================================
// //            TOP BAR
// //         ===================================================== */

// //         .topbar {
// //           min-height: 66px;

// //           display: grid;
// //           grid-template-columns:
// //             1fr
// //             minmax(280px, 440px)
// //             1fr;

// //           align-items: center;

// //           gap: 20px;

// //           margin-bottom: 42px;

// //           border-bottom:
// //             1px solid
// //             rgba(189, 202, 186, .35);
// //         }

// //         .breadcrumbs {
// //           display: flex;
// //           align-items: center;
// //           gap: 6px;

// //           color: ${MUTED};

// //           font-size: 14px;
// //           font-weight: 600;
// //         }

// //         .breadcrumbs strong {
// //           color: ${GREEN};
// //         }

// //         .breadcrumbs
// //         .material-symbols-outlined {
// //           font-size: 18px;
// //         }


// //         .searchBox {
// //           position: relative;
// //         }

// //         .searchBox
// //         > .material-symbols-outlined {
// //           position: absolute;

// //           left: 14px;
// //           top: 50%;

// //           transform:
// //             translateY(-50%);

// //           color: ${MUTED};

// //           font-size: 20px;
// //         }

// //         .searchBox input {
// //           width: 100%;
// //           height: 44px;

// //           padding:
// //             0 40px
// //             0 42px;

// //           border:
// //             1.5px solid
// //             ${BORDER};

// //           border-radius: 999px;

// //           outline: none;

// //           background: #f7f9f8;
// //           color: ${NAVY};

// //           font-family: inherit;
// //           font-size: 14px;

// //           transition:
// //             .18s ease;
// //         }

// //         .searchBox input:focus {
// //           background: white;

// //           border-color:
// //             #9bc4a9;

// //           box-shadow:
// //             0 0 0 3px
// //             ${GREEN_SOFT};
// //         }

// //         .searchBox button {
// //           position: absolute;

// //           right: 10px;
// //           top: 50%;

// //           transform:
// //             translateY(-50%);

// //           border: 0;

// //           background: transparent;

// //           color: ${MUTED};

// //           cursor: pointer;

// //           font-family:
// //             "Material Symbols Outlined";

// //           font-size: 20px;
// //         }

// //         .notificationButton {
// //           justify-self: end;

// //           width: 44px;
// //           height: 44px;

// //           display: grid;
// //           place-items: center;

// //           border: 1.5px solid ${BORDER};
// //           border-radius: 50%;

// //           background: white;

// //           color: ${GREEN};

// //           cursor: pointer;
// //         }

// //         .notificationButton
// //         .material-symbols-outlined {
// //           font-size: 22px;
// //         }


// //         /* =====================================================
// //            HERO
// //         ===================================================== */

// //         .hero {
// //           display: flex;
// //           align-items: flex-end;
// //           justify-content: space-between;

// //           gap: 30px;

// //           margin-bottom: 36px;
// //         }

// //         .heroContent {
// //           max-width: 720px;
// //         }

// //         .eyebrow,
// //         .sectionEyebrow {
// //           color: ${GREEN};

// //           font-size: 11px;
// //           font-weight: 850;

// //           letter-spacing: .16em;
// //         }

// //         .hero h1 {
// //           margin:
// //             12px 0 12px;

// //           color: ${NAVY};

// //           font-size: 40px;
// //           line-height: 1;

// //           letter-spacing:
// //             -.05em;

// //           font-weight: 760;
// //         }

// //         .hero p {
// //           max-width: 680px;

// //           margin: 0;

// //           color: ${TEXT};

// //           font-size: 15px;
// //           line-height: 1.7;
// //         }

// //         .createButton {
// //           min-height: 48px;

// //           display: inline-flex;
// //           align-items: center;
// //           justify-content: center;

// //           gap: 8px;

// //           padding:
// //             0 22px;

// //           border-radius: 999px;

// //           background: ${GREEN};
// //           color: white;

// //           text-decoration: none;

// //           font-size: 14px;
// //           font-weight: 750;

// //           white-space: nowrap;

// //           transition:
// //             transform .18s ease,
// //             background .18s ease,
// //             box-shadow .18s ease;
// //         }

// //         .createButton:hover {
// //           background: ${GREEN_DARK};

// //           transform:
// //             translateY(-2px);

// //           box-shadow:
// //             0 12px 24px
// //             rgba(0, 107, 44, .18);
// //         }

// //         .createButton
// //         .material-symbols-outlined {
// //           font-size: 22px;
// //         }


// //         /* =====================================================
// //            ERROR
// //         ===================================================== */

// //         .errorBox {
// //           display: flex;
// //           align-items: center;

// //           gap: 12px;

// //           margin-bottom: 20px;
// //           padding: 14px 16px;

// //           border:
// //             1px solid
// //             #eadfbd;

// //           border-radius: 12px;

// //           background: #fff8eb;

// //           color: ${GOLD};

// //           font-size: 13px;
// //         }

// //         .errorIcon {
// //           width: 24px;
// //           height: 24px;

// //           display: grid;
// //           place-items: center;

// //           border-radius: 50%;

// //           background: #f1e4bf;

// //           font-weight: 800;
// //         }

// //         .errorBox button {
// //           margin-left: auto;

// //           border: 0;

// //           background: transparent;

// //           color: ${GOLD};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 13px;
// //           font-weight: 800;
// //         }


// //         /* =====================================================
// //            TABS
// //         ===================================================== */

// //         .tabs {
// //           display: flex;
// //           align-items: center;

// //           gap: 2px;

// //           margin-bottom: 32px;

// //           border-bottom:
// //             1px solid
// //             ${BORDER};
// //         }

// //         .tab {
// //           min-height: 52px;

// //           display: flex;
// //           align-items: center;

// //           gap: 8px;

// //           padding:
// //             0 18px;

// //           margin-bottom: -1px;

// //           border: 0;

// //           border-bottom:
// //             2px solid
// //             transparent;

// //           background: transparent;

// //           color: ${MUTED};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 14px;
// //           font-weight: 750;
// //         }

// //         .tab.active {
// //           color: ${GREEN};

// //           border-bottom-color:
// //             ${GREEN};
// //         }

// //         .tab
// //         .material-symbols-outlined {
// //           font-size: 22px;
// //         }

// //         .tab b {
// //           min-width: 24px;

// //           padding:
// //             4px 8px;

// //           border-radius: 999px;

// //           background: #f0f3f1;

// //           font-size: 12px;
// //         }

// //         .tab.active b {
// //           background:
// //             ${GREEN_SOFT};

// //           color:
// //             ${GREEN};
// //         }


// //         /* =====================================================
// //            SECTION HEADER
// //         ===================================================== */

// //         .sectionHeader {
// //           display: flex;
// //           align-items: flex-end;
// //           justify-content: space-between;

// //           gap: 20px;

// //           margin-bottom: 20px;
// //         }

// //         .sectionHeader h2,
// //         .discoverHeader h2 {
// //           margin:
// //             8px 0 8px;

// //           color: ${NAVY};

// //           font-size: 26px;

// //           letter-spacing:
// //             -.035em;

// //           font-weight: 760;
// //         }

// //         .sectionHeader p {
// //           margin: 0;

// //           color: ${MUTED};

// //           font-size: 14px;
// //         }

// //         .discoverButton {
// //           display: inline-flex;
// //           align-items: center;

// //           gap: 6px;

// //           border: 0;

// //           background: transparent;

// //           color: ${GREEN};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 14px;
// //           font-weight: 800;
// //         }

// //         .discoverButton
// //         .material-symbols-outlined {
// //           font-size: 20px;
// //         }


// //         /* =====================================================
// //            DISCOVER HEADER
// //         ===================================================== */

// //         .discoverHeader {
// //           display: flex;
// //           align-items: center;
// //           justify-content: space-between;

// //           gap: 30px;

// //           padding: 24px;

// //           margin-bottom: 20px;

// //           border:
// //             1px solid
// //             #dcebe1;

// //           border-radius: 16px;

// //           background:
// //             linear-gradient(
// //               135deg,
// //               #f0f8f3,
// //               #f8fbf9
// //             );
// //         }

// //         .discoverCopy {
// //           max-width: 650px;
// //         }

// //         .discoverHeader p {
// //           margin: 0;

// //           color: ${TEXT};

// //           font-size: 14px;

// //           line-height: 1.65;
// //         }

// //         .discoverStats {
// //           display: flex;
// //           align-items: center;

// //           gap: 20px;

// //           flex-shrink: 0;
// //         }

// //         .discoverStat {
// //           display: flex;
// //           flex-direction: column;

// //           gap: 6px;
// //         }

// //         .discoverStat strong {
// //           color: ${NAVY};

// //           font-size: 24px;
// //           line-height: 1;
// //         }

// //         .discoverStat span {
// //           color: ${MUTED};

// //           font-size: 12px;
// //           font-weight: 700;
// //         }

// //         .discoverDivider {
// //           width: 1px;
// //           height: 36px;

// //           background:
// //             #d5e1d9;
// //         }


// //         /* =====================================================
// //            FILTERS
// //         ===================================================== */

// //         .filters {
// //           display: flex;
// //           align-items: center;

// //           gap: 8px;

// //           margin-bottom: 24px;
// //         }

// //         .filter {
// //           display: inline-flex;
// //           align-items: center;

// //           gap: 6px;

// //           padding:
// //             10px 16px;

// //           border:
// //             1.5px solid
// //             ${BORDER};

// //           border-radius: 999px;

// //           background: white;

// //           color: ${MUTED};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 12px;
// //           font-weight: 750;

// //           transition:
// //             .16s ease;
// //         }

// //         .filter:hover {
// //           border-color:
// //             #bfd2c5;
// //         }

// //         .filter.active {
// //           border-color:
// //             ${GREEN};

// //           background:
// //             ${GREEN};

// //           color: white;
// //         }

// //         .filter
// //         .material-symbols-outlined {
// //           font-size: 16px;
// //         }


// //         /* =====================================================
// //            GRID
// //         ===================================================== */

// //         .grid {
// //           display: grid;

// //           grid-template-columns:
// //             repeat(
// //               3,
// //               minmax(0, 1fr)
// //             );

// //           gap: 20px;
// //         }


// //         /* =====================================================
// //            GROUP CARD
// //         ===================================================== */

// //         .groupCardLink {
// //           display: block;

// //           height: 100%;

// //           color: inherit;

// //           text-decoration: none;
// //         }

// //         .groupCard {
// //           height: 100%;

// //           display: flex;
// //           flex-direction: column;

// //           gap: 14px;

// //           padding: 20px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 16px;

// //           background: white;

// //           box-shadow:
// //             0 5px 20px
// //             rgba(
// //               15,
// //               23,
// //               42,
// //               .025
// //             );

// //           transition:
// //             transform .18s ease,
// //             box-shadow .18s ease,
// //             border-color .18s ease;
// //         }

// //         .groupCard:hover {
// //           transform:
// //             translateY(-3px);

// //           border-color:
// //             #c6dacd;

// //           box-shadow:
// //             0 16px 36px
// //             rgba(
// //               15,
// //               23,
// //               42,
// //               .08
// //             );
// //         }

// //         .cardTop {
// //           display: flex;
// //           align-items: flex-start;
// //           justify-content: space-between;

// //           gap: 12px;
// //         }

// //         .identity {
// //           min-width: 0;

// //           display: flex;
// //           align-items: center;

// //           gap: 12px;
// //         }

// //         .groupIcon {
// //           width: 48px;
// //           height: 48px;

// //           display: grid;
// //           place-items: center;

// //           flex: 0 0 auto;

// //           border-radius: 14px;

// //           background:
// //             ${GREEN_SOFT};

// //           color:
// //             ${GREEN};
// //         }

// //         .groupIcon
// //         .material-symbols-outlined {
// //           font-size: 26px;
// //         }

// //         .identityText {
// //           min-width: 0;
// //         }

// //         .identityText h3 {
// //           margin:
// //             0 0 6px;

// //           overflow: hidden;

// //           color: ${NAVY};

// //           font-size: 16px;
// //           font-weight: 760;

// //           text-overflow:
// //             ellipsis;

// //           white-space:
// //             nowrap;
// //         }

// //         .identityText span {
// //           display: block;

// //           max-width: 210px;

// //           overflow: hidden;

// //           color: ${MUTED};

// //           font-size: 12px;
// //           font-weight: 600;

// //           text-overflow:
// //             ellipsis;

// //           white-space:
// //             nowrap;
// //         }


// //         /* STATUS */

// //         .status {
// //           padding:
// //             6px 10px;

// //           border-radius: 999px;

// //           font-size: 11px;
// //           font-weight: 850;

// //           white-space: nowrap;
// //         }

// //         .status.active {
// //           background:
// //             ${GREEN_SOFT};

// //           color:
// //             ${GREEN};
// //         }

// //         .status.other {
// //           background:
// //             #f1f3f2;

// //           color:
// //             ${MUTED};
// //         }


// //         /* =====================================================
// //            VERIFICATION
// //         ===================================================== */

// //         .verification {
// //           min-height: 32px;

// //           display: flex;
// //           align-items: center;

// //           gap: 6px;

// //           padding:
// //             0 12px;

// //           border-radius: 10px;

// //           background:
// //             ${GREEN_SOFT};

// //           color:
// //             ${GREEN};

// //           font-size: 12px;
// //           font-weight: 800;
// //         }

// //         .verification.unverified {
// //           background:
// //             #f5f6f5;

// //           color:
// //             ${MUTED};
// //         }

// //         .verification
// //         .material-symbols-outlined {
// //           font-size: 18px;
// //         }


// //         /* =====================================================
// //            INSIGHT
// //         ===================================================== */

// //         .insight {
// //           min-height: 48px;

// //           padding: 12px;

// //           border-radius: 10px;

// //           background:
// //             #fafcf9;

// //           color: ${TEXT};

// //           font-size: 12px;

// //           line-height:
// //             1.55;
// //         }

// //         .insight strong {
// //           color:
// //             ${GREEN};
// //         }


// //         /* =====================================================
// //            STATS
// //         ===================================================== */

// //         .stats {
// //           display: grid;

// //           grid-template-columns:
// //             1fr 1fr;

// //           gap: 14px;

// //           padding:
// //             14px 0;

// //           border-top:
// //             1px solid
// //             #edf0ee;

// //           border-bottom:
// //             1px solid
// //             #edf0ee;
// //         }

// //         .stat span {
// //           display: block;

// //           margin-bottom: 6px;

// //           color: ${MUTED};

// //           font-size: 10px;
// //           font-weight: 800;

// //           letter-spacing:
// //             .04em;
// //         }

// //         .stat strong {
// //           color:
// //             ${NAVY};

// //           font-size: 14px;
// //           font-weight: 760;
// //         }

// //         .stat strong.money {
// //           color:
// //             ${GREEN};
// //         }


// //         /* =====================================================
// //            CAPACITY
// //         ===================================================== */

// //         .capacity {
// //           padding-top: 2px;
// //         }

// //         .capacityHead {
// //           display: flex;
// //           align-items: center;
// //           justify-content: space-between;

// //           margin-bottom: 8px;
// //         }

// //         .capacityHead span {
// //           color: ${MUTED};

// //           font-size: 10px;
// //           font-weight: 800;
// //         }

// //         .capacityHead strong {
// //           color: ${GREEN};

// //           font-size: 12px;
// //         }

// //         .capacityBar {
// //           width: 100%;
// //           height: 5px;

// //           overflow: hidden;

// //           border-radius: 999px;

// //           background:
// //             #edf1ee;
// //         }

// //         .capacityFill {
// //           height: 100%;

// //           border-radius: inherit;

// //           background:
// //             ${GREEN};

// //           transition:
// //             width .4s ease;
// //         }


// //         /* =====================================================
// //            CARD FOOTER
// //         ===================================================== */

// //         .cardBottom {
// //           display: flex;
// //           align-items: center;
// //           justify-content: space-between;

// //           gap: 12px;

// //           margin-top: auto;
// //         }

// //         .location {
// //           min-width: 0;

// //           display: flex;
// //           align-items: center;

// //           gap: 6px;

// //           color: ${MUTED};

// //           font-size: 12px;
// //         }

// //         .location
// //         .material-symbols-outlined {
// //           flex: 0 0 auto;

// //           font-size: 18px;
// //         }

// //         .locationText {
// //           overflow: hidden;

// //           text-overflow:
// //             ellipsis;

// //           white-space:
// //             nowrap;
// //         }

// //         .arrow {
// //           width: 36px;
// //           height: 36px;

// //           display: grid;
// //           place-items: center;

// //           flex: 0 0 auto;

// //           border-radius: 50%;

// //           background:
// //             ${NAVY};

// //           color: white;
// //         }

// //         .arrow
// //         .material-symbols-outlined {
// //           font-size: 20px;
// //         }


// //         /* =====================================================
// //            EMPTY
// //         ===================================================== */

// //         .empty {
// //           padding:
// //             70px 24px;

// //           border:
// //             1.5px dashed
// //             ${BORDER};

// //           border-radius: 16px;

// //           background: white;

// //           text-align: center;
// //         }

// //         .emptyIcon {
// //           width: 64px;
// //           height: 64px;

// //           display: grid;
// //           place-items: center;

// //           margin:
// //             0 auto 16px;

// //           border-radius: 18px;

// //           background:
// //             #f1f4f2;

// //           color:
// //             ${GREEN};
// //         }

// //         .emptyIcon
// //         .material-symbols-outlined {
// //           font-size: 32px;
// //         }

// //         .empty h3 {
// //           margin:
// //             0 0 8px;

// //           color:
// //             ${NAVY};

// //           font-size: 22px;
// //         }

// //         .empty p {
// //           max-width: 480px;

// //           margin:
// //             0 auto 24px;

// //           color:
// //             ${MUTED};

// //           font-size: 14px;

// //           line-height: 1.65;
// //         }

// //         .emptyActions {
// //           display: flex;
// //           align-items: center;
// //           justify-content: center;

// //           gap: 12px;
// //         }

// //         .emptyActions button,
// //         .emptyActions a {
// //           display: inline-flex;
// //           align-items: center;
// //           justify-content: center;

// //           min-height: 44px;

// //           padding:
// //             0 18px;

// //           border-radius: 12px;

// //           font-family: inherit;

// //           font-size: 13px;
// //           font-weight: 800;

// //           text-decoration: none;

// //           cursor: pointer;
// //         }

// //         .emptyActions button {
// //           border:
// //             1.5px solid
// //             ${BORDER};

// //           background: white;

// //           color:
// //             ${GREEN};
// //         }

// //         .emptyActions a {
// //           background:
// //             ${GREEN};

// //           color: white;
// //         }


// //         /* =====================================================
// //            DISCOVER LOADING
// //         ===================================================== */

// //         .discoverLoading {
// //           min-height: 280px;

// //           display: flex;
// //           flex-direction: column;

// //           align-items: center;
// //           justify-content: center;

// //           gap: 10px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 16px;

// //           background: white;

// //           color: ${MUTED};

// //           font-size: 14px;
// //         }

// //         .discoverLoading strong {
// //           color: ${NAVY};

// //           font-size: 16px;
// //         }

// //         .spinner {
// //           width: 32px;
// //           height: 32px;

// //           margin-bottom: 8px;

// //           border:
// //             3px solid
// //             #e5ece7;

// //           border-top-color:
// //             ${GREEN};

// //           border-radius: 50%;

// //           animation:
// //             groupSpin .7s
// //             linear infinite;
// //         }

// //         @keyframes groupSpin {
// //           to {
// //             transform:
// //               rotate(360deg);
// //           }
// //         }


// //         /* =====================================================
// //            NO RESULTS
// //         ===================================================== */

// //         .noResults {
// //           min-height: 300px;

// //           display: flex;
// //           flex-direction: column;

// //           align-items: center;
// //           justify-content: center;

// //           padding: 40px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 16px;

// //           background: white;

// //           text-align: center;
// //         }

// //         .noResultsIcon {
// //           width: 56px;
// //           height: 56px;

// //           display: grid;
// //           place-items: center;

// //           border-radius: 16px;

// //           background:
// //             #f2f5f3;

// //           color:
// //             ${MUTED};
// //         }

// //         .noResultsIcon
// //         .material-symbols-outlined {
// //           font-size: 28px;
// //         }

// //         .noResults h3 {
// //           margin:
// //             16px 0 8px;

// //           color:
// //             ${NAVY};

// //           font-size: 20px;
// //         }

// //         .noResults p {
// //           max-width: 440px;

// //           margin: 0;

// //           color:
// //             ${MUTED};

// //           font-size: 13px;

// //           line-height: 1.65;
// //         }

// //         .noResults button {
// //           margin-top: 20px;

// //           min-height: 40px;

// //           padding:
// //             0 16px;

// //           border:
// //             1.5px solid
// //             ${BORDER};

// //           border-radius: 10px;

// //           background: white;

// //           color:
// //             ${GREEN};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 13px;
// //           font-weight: 800;
// //         }


// //         /* =====================================================
// //            TRUST FOOTER
// //         ===================================================== */

// //         .trustFooter {
// //           display: flex;
// //           align-items: flex-start;

// //           gap: 12px;

// //           max-width: 800px;

// //           margin-top: 36px;

// //           padding: 16px;

// //           border-radius: 12px;

// //           background:
// //             #f7faf8;
// //         }

// //         .trustFooter
// //         > .material-symbols-outlined {
// //           flex: 0 0 auto;

// //           color:
// //             ${GREEN};

// //           font-size: 22px;
// //         }

// //         .trustFooter strong {
// //           display: block;

// //           margin-bottom: 6px;

// //           color:
// //             ${NAVY};

// //           font-size: 13px;
// //         }

// //         .trustFooter p {
// //           margin: 0;

// //           color:
// //             ${MUTED};

// //           font-size: 12px;

// //           line-height: 1.65;
// //         }


// //         /* =====================================================
// //            RESPONSIVE
// //         ===================================================== */

// //         @media (max-width: 1050px) {

// //           .grid {
// //             grid-template-columns:
// //               repeat(
// //                 2,
// //                 minmax(0, 1fr)
// //               );
// //           }

// //         }


// //         @media (max-width: 760px) {

// //           .groupsPage {
// //             padding:
// //               0 14px 45px;
// //           }

// //           .topbar {
// //             grid-template-columns:
// //               1fr auto;

// //             gap: 12px;

// //             margin-bottom:
// //               30px;
// //           }

// //           .searchBox {
// //             grid-column:
// //               1 / -1;

// //             grid-row: 2;
// //           }

// //           .hero {
// //             align-items:
// //               flex-start;

// //             flex-direction:
// //               column;
// //           }

// //           .createButton {
// //             width: 100%;
// //           }

// //           .grid {
// //             grid-template-columns:
// //               1fr;
// //           }

// //           .discoverHeader {
// //             align-items:
// //               flex-start;

// //             flex-direction:
// //               column;
// //           }

// //           .discoverStats {
// //             width: 100%;
// //           }

// //         }


// //         @media (max-width: 480px) {

// //           .hero h1 {
// //             font-size: 32px;
// //           }

// //           .sectionHeader {
// //             align-items:
// //               flex-start;

// //             flex-direction:
// //               column;
// //           }

// //           .discoverButton {
// //             padding: 0;
// //           }

// //           .tabs {
// //             width: 100%;
// //           }

// //           .tab {
// //             flex: 1;

// //             justify-content:
// //               center;
// //           }

// //           .tab
// //           .material-symbols-outlined {
// //             display: none;
// //           }

// //           .filters {
// //             overflow-x: auto;

// //             flex-wrap:
// //               nowrap;

// //             padding-bottom: 3px;
// //           }

// //           .filter {
// //             flex-shrink: 0;

// //             white-space:
// //               nowrap;
// //           }

// //           .discoverStats {
// //             justify-content:
// //               space-between;
// //           }

// //           .discoverDivider {
// //             height: 24px;
// //           }

// //           .status {
// //             display: none;
// //           }

// //         }

// //       `}</style>

// //     </main>
// //   );
// // }


// // /* =========================================================
// //    GROUP CARD
// // ========================================================= */

// // function GroupCard({
// //   group,
// //   mine = false,
// // }: {
// //   group: Group;
// //   mine?: boolean;
// // }) {
// //   const verified =
// //     isVerified(group);

// //   const members =
// //     numberValue(
// //       group.member_count
// //     );

// //   const maximum =
// //     numberValue(
// //       group.max_members
// //     ) || 20;

// //   const pool =
// //     numberValue(
// //       group.pool_amount
// //     );

// //   const contribution =
// //     numberValue(
// //       group.contribution_amount
// //     );

// //   const capacity =
// //     maximum > 0
// //       ? Math.min(
// //           100,
// //           Math.round(
// //             (members /
// //               maximum) *
// //               100
// //           )
// //         )
// //       : 0;

// //   const status =
// //     String(
// //       group.status ||
// //         "active"
// //     );

// //   const frequency =
// //     "Monthly";

// //   const location =
// //     group.location ||
// //     group.city ||
// //     group.state ||
// //     "Location not provided";

// //   /* =======================================================
// //      INTELLIGENCE
// //   ======================================================= */

// //   let insight =
// //     "Review the group's details before making a decision.";

// //   if (verified) {
// //     if (members >= 10) {
// //       insight =
// //         "Kolo Verified · This is an established group with a strong member base.";
// //     } else if (
// //       capacity >= 80
// //     ) {
// //       insight =
// //         "Kolo Verified · The group is close to its stated membership capacity.";
// //     } else {
// //       insight =
// //         "Kolo Verified · The group's submitted cooperative information has completed Kolo review.";
// //     }
// //   } else if (
// //     status.toLowerCase() ===
// //     "active"
// //   ) {
// //     insight =
// //       "Active group · Check its Kolo verification status and group details before committing funds.";
// //   }

// //   if (
// //     members >= maximum &&
// //     maximum > 0
// //   ) {
// //     insight =
// //       verified
// //         ? "Kolo Verified · The group has reached its stated member capacity."
// //         : "The group has reached its stated member capacity.";
// //   }

// //   return (
// //     <Link
// //       href={`/groups/${group.id}`}
// //       className="groupCardLink"
// //     >
// //       <article className="groupCard">

// //         {/* TOP */}

// //         <div className="cardTop">

// //           <div className="identity">

// //             <div className="groupIcon">
// //               <span className="material-symbols-outlined">
// //                 account_balance
// //               </span>
// //             </div>

// //             <div className="identityText">

// //               <h3>
// //                 {group.name}
// //               </h3>

// //               <span>
// //                 {group.description ||
// //                   "Savings community"}
// //               </span>

// //             </div>

// //           </div>

// //           <span
// //             className={
// //               status.toLowerCase() ===
// //               "active"
// //                 ? "status active"
// //                 : "status other"
// //             }
// //           >
// //             {status}
// //           </span>

// //         </div>


// //         {/* VERIFICATION */}

// //         <div
// //           className={
// //             verified
// //               ? "verification"
// //               : "verification unverified"
// //           }
// //         >

// //           <span className="material-symbols-outlined">
// //             {verified
// //               ? "verified"
// //               : "help_outline"}
// //           </span>

// //           {verified
// //             ? "Kolo Verified"
// //             : "Not Kolo Verified"}

// //         </div>


// //         {/* INSIGHT */}

// //         <div className="insight">

// //           <strong>
// //             Kolo insight:
// //           </strong>{" "}

// //           {insight}

// //         </div>


// //         {/* STATS */}

// //         <div className="stats">

// //           <div className="stat">

// //             <span>
// //               MEMBERS
// //             </span>

// //             <strong>
// //               {members}
// //               {" / "}
// //               {maximum}
// //             </strong>

// //           </div>


// //           <div className="stat">

// //             <span>
// //               CONTRIBUTION
// //             </span>

// //             <strong className="money">
// //               {contribution > 0
// //                 ? formatNaira(
// //                     contribution
// //                   )
// //                 : "Not specified"}
// //             </strong>

// //           </div>


// //           <div className="stat">

// //             <span>
// //               CURRENT POOL
// //             </span>

// //             <strong className="money">
// //               {formatNaira(pool)}
// //             </strong>

// //           </div>


// //           <div className="stat">

// //             <span>
// //               CYCLE
// //             </span>

// //             <strong>
// //               {group.cycle_number
// //                 ? `Cycle ${group.cycle_number}`
// //                 : "Current"}
// //             </strong>

// //           </div>

// //         </div>


// //         {/* CAPACITY */}

// //         <div className="capacity">

// //           <div className="capacityHead">

// //             <span>
// //               GROUP CAPACITY
// //             </span>

// //             <strong>
// //               {capacity}%
// //             </strong>

// //           </div>

// //           <div className="capacityBar">

// //             <div
// //               className="capacityFill"
// //               style={{
// //                 width:
// //                   `${capacity}%`,
// //               }}
// //             />

// //           </div>

// //         </div>


// //         {/* FOOTER */}

// //         <div className="cardBottom">

// //           <div className="location">

// //             <span className="material-symbols-outlined">
// //               location_on
// //             </span>

// //             <span className="locationText">
// //               {location}
// //             </span>

// //           </div>


// //           <div className="arrow">

// //             <span className="material-symbols-outlined">
// //               arrow_forward
// //             </span>

// //           </div>

// //         </div>

// //       </article>
// //     </Link>
// //   );
// // }


// // /* =========================================================
// //    EMPTY STATE
// // ========================================================= */

// // function EmptyGroups({
// //   isAdmin,
// //   onDiscover,
// // }: {
// //   isAdmin: boolean;
// //   onDiscover: () => void;
// // }) {
// //   return (
// //     <div className="empty">

// //       <div className="emptyIcon">

// //         <span className="material-symbols-outlined">
// //           groups
// //         </span>

// //       </div>

// //       <h3>
// //         You haven't joined a group yet
// //       </h3>

// //       <p>
// //         Explore other savings communities
// //         or create a group if you're an
// //         authorized Kolo administrator.
// //       </p>

// //       <div className="emptyActions">

// //         <button
// //           type="button"
// //           onClick={onDiscover}
// //         >
// //           Explore groups
// //         </button>

// //         {isAdmin && (
// //           <Link href="/groups/create">
// //             Create group
// //           </Link>
// //         )}

// //       </div>

// //     </div>
// //   );
// // }



// // "use client";

// // import Link from "next/link";
// // import {
// //   useCallback,
// //   useEffect,
// //   useMemo,
// //   useState,
// // } from "react";

// // import { createClient } from "@/lib/supabase/client";

// // /* =========================================================
// //    TYPES
// // ========================================================= */

// // type Group = {
// //   verification_status: string;
// //   verified_at(verified_at: any): boolean;
// //   id: string;
// //   name: string;
// //   description?: string | null;

// //   pool_amount?: number | string | null;
// //   member_count?: number | string | null;
// //   max_members?: number | string | null;

// //   status?: string | null;
// //   cycle_number?: number | string | null;

// //   contribution_amount?: number | string | null;

// //   next_due_date?: string | null;
// //   next_payout_date?: string | null;
// //   last_payout_date?: string | null;

// //   location?: string | null;
// //   city?: string | null;
// //   state?: string | null;

// //   created_at?: string | null;
// // };

// // type Membership = {
// //   group_id: string;
// //   role?: string | null;
// //   groups: Group | null;
// // };

// // type Verification = {
// //   group_id: string;
// //   status?: string | null;
// //   verified_at?: string | null;
// //   cooperative_location?: string | null;
// // };

// // type Tab = "mine" | "discover";
// // type Filter = "all" | "verified" | "active";

// // /* =========================================================
// //    CONSTANTS
// // ========================================================= */

// // const GREEN = "#006b2c";
// // const GREEN_DARK = "#005522";
// // const GREEN_SOFT = "#edf7f0";

// // const NAVY = "#0b1c30";
// // const TEXT = "#3e4a3d";
// // const MUTED = "#6e7b6c";

// // const BORDER = "#e4e9e6";
// // const GOLD = "#825100";

// // /* =========================================================
// //    HELPERS
// // ========================================================= */

// // function formatNaira(value: number | string | null | undefined) {
// //   const amount = Number(value || 0);

// //   return `₦${amount.toLocaleString("en-NG", {
// //     maximumFractionDigits: 0,
// //   })}`;
// // }

// // function numberValue(value: number | string | null | undefined) {
// //   return Number(value || 0);
// // }

// // function isVerified(group: Group) {
// //   return (
// //     String(group.verification_status || "").toLowerCase() ===
// //       "verified" ||
// //     Boolean(group.verified_at)
// //   );
// // }

// // /* =========================================================
// //    PAGE
// // ========================================================= */

// // export default function GroupsPage() {
// //   const supabase = createClient();

// //   const [userId, setUserId] = useState<string>("");

// //   const [myGroups, setMyGroups] = useState<Group[]>([]);
// //   const [discoverGroups, setDiscoverGroups] = useState<Group[]>([]);

// //   const [loading, setLoading] = useState(true);
// //   const [discoverLoading, setDiscoverLoading] = useState(true);

// //   const [isAdmin, setIsAdmin] = useState(false);

// //   const [tab, setTab] = useState<Tab>("mine");
// //   const [filter, setFilter] = useState<Filter>("all");
// //   const [search, setSearch] = useState("");

// //   const [error, setError] = useState("");

// //   /* =======================================================
// //      VERIFICATION ENRICHMENT
// //   ======================================================= */

// //   const attachVerification = useCallback(
// //     async (groups: Group[]) => {
// //       if (!groups.length) return groups;

// //       const ids = groups.map((group) => group.id);

// //       const { data, error: verificationError } =
// //         await supabase
// //           .from("verification_submissions")
// //           .select(
// //             `
// //               group_id,
// //               status,
// //               verified_at,
// //               cooperative_location
// //             `
// //           )
// //           .in("group_id", ids)
// //           .order("verified_at", {
// //             ascending: false,
// //           });

// //       if (verificationError) {
// //         console.warn(
// //           "Verification lookup:",
// //           verificationError.message
// //         );

// //         return groups;
// //       }

// //       const verificationMap = new Map<
// //         string,
// //         Verification
// //       >();

// //       (data || []).forEach((item) => {
// //         const verification =
// //           item as Verification;

// //         /*
// //          * First/latest record for a group wins.
// //          */
// //         if (!verificationMap.has(verification.group_id)) {
// //           verificationMap.set(
// //             verification.group_id,
// //             verification
// //           );
// //         }
// //       });

// //       return groups.map((group) => {
// //         const verification =
// //           verificationMap.get(group.id);

// //         return {
// //           ...group,

// //           verification_status:
// //             verification?.status || null,

// //           verified_at:
// //             verification?.verified_at || null,

// //           location:
// //             group.location ||
// //             group.city ||
// //             group.state ||
// //             verification?.cooperative_location ||
// //             null,
// //         };
// //       });
// //     },
// //     [supabase]
// //   );

// //   /* =======================================================
// //      LOAD CURRENT USER + MY GROUPS
// //   ======================================================= */

// //   const loadMyGroups = useCallback(async () => {
// //     try {
// //       setError("");

// //       const {
// //         data: { user },
// //       } = await supabase.auth.getUser();

// //       if (!user) {
// //         window.location.href = "/login";
// //         return;
// //       }

// //       setUserId(user.id);

// //       const {
// //         data,
// //         error: membershipError,
// //       } = await supabase
// //         .from("group_members")
// //         .select(
// //           `
// //             group_id,
// //             role,
// //             groups(*)
// //           `
// //         )
// //         .eq("user_id", user.id);

// //       if (membershipError) {
// //         console.error(
// //           "Group membership error:",
// //           membershipError
// //         );

// //         setError(
// //           "We couldn't load your groups. Please try again."
// //         );

// //         return;
// //       }

// //       const memberships =
// //         (data || []) as unknown as Membership[];

// //       const groups = memberships
// //         .map((item) => item.groups)
// //         .filter(Boolean) as Group[];

// //       const enriched =
// //         await attachVerification(groups);

// //       setMyGroups(enriched);

// //       /*
// //        * Admin access is based on the membership role.
// //        *
// //        * UI protection is not security by itself.
// //        * The actual create-group permission should
// //        * also be enforced by Supabase RLS.
// //        */
// //       const admin =
// //         memberships.some((membership) => {
// //           const role =
// //             String(
// //               membership.role || ""
// //             ).toLowerCase();

// //           return [
// //             "admin",
// //             "administrator",
// //             "owner",
// //             "treasurer",
// //           ].includes(role);
// //         });

// //       setIsAdmin(admin);
// //     } catch (err) {
// //       console.error(
// //         "loadMyGroups:",
// //         err
// //       );

// //       setError(
// //         "Something went wrong while loading your groups."
// //       );
// //     }
// //   }, [
// //     supabase,
// //     attachVerification,
// //   ]);

// //   /* =======================================================
// //      LOAD DISCOVERABLE GROUPS
// //   ======================================================= */

// //   const loadDiscoverGroups = useCallback(
// //     async (currentUserId: string) => {
// //       try {
// //         setDiscoverLoading(true);

// //         /*
// //          * IMPORTANT:
// //          *
// //          * We only request fields that actually exist
// //          * in the groups structure you supplied.
// //          *
// //          * We deliberately do NOT request:
// //          * - bank account
// //          * - account number
// //          * - payment details
// //          * - receipts
// //          * - member financial information
// //          */

// //         const {
// //           data,
// //           error: groupsError,
// //         } = await supabase
// //           .from("groups")
// //           .select(
// //             `
// //               id,
// //               name,
// //               description,
// //               pool_amount,
// //               member_count,
// //               max_members,
// //               status,
// //               cycle_number,
// //               contribution_amount,
// //               next_due_date,
// //               next_payout_date,
// //               last_payout_date,
// //               created_at
// //             `
// //           )
// //           .neq("status", "archived")
// //           .order("created_at", {
// //             ascending: false,
// //           })
// //           .limit(100);

// //         if (groupsError) {
// //           console.error(
// //             "Discover groups error:",
// //             groupsError
// //           );

// //           setDiscoverGroups([]);

// //           return;
// //         }

// //         const allGroups =
// //           (data || []) as Group[];

// //         /*
// //          * Groups the user already belongs to.
// //          */
// //         const myGroupIds =
// //           new Set(
// //             myGroups.map(
// //               (group) => group.id
// //             )
// //           );

// //         /*
// //          * Discover:
// //          *
// //          * - not already joined
// //          * - active
// //          *
// //          * Since your current schema doesn't contain
// //          * public/private visibility, active groups are
// //          * treated as discoverable for this version.
// //          */
// //         const discoverable =
// //           allGroups.filter((group) => {
// //             const status =
// //               String(
// //                 group.status || ""
// //               ).toLowerCase();

// //             return (
// //               !myGroupIds.has(group.id) &&
// //               status === "active"
// //             );
// //           });

// //         const enriched =
// //           await attachVerification(
// //             discoverable
// //           );

// //         setDiscoverGroups(enriched);
// //       } catch (err) {
// //         console.error(
// //           "loadDiscoverGroups:",
// //           err
// //         );

// //         setDiscoverGroups([]);
// //       } finally {
// //         setDiscoverLoading(false);
// //       }
// //     },
// //     [
// //       supabase,
// //       myGroups,
// //       attachVerification,
// //     ]
// //   );

// //   /* =======================================================
// //      INITIAL LOAD
// //   ======================================================= */

// //   useEffect(() => {
// //     let mounted = true;

// //     async function initialise() {
// //       if (!mounted) return;

// //       setLoading(true);

// //       await loadMyGroups();

// //       if (mounted) {
// //         setLoading(false);
// //       }
// //     }

// //     initialise();

// //     return () => {
// //       mounted = false;
// //     };
// //   }, [loadMyGroups]);

// //   /* =======================================================
// //      LOAD DISCOVER AFTER MY GROUPS
// //   ======================================================= */

// //   useEffect(() => {
// //     if (!loading && userId) {
// //       loadDiscoverGroups(userId);
// //     }
// //   }, [
// //     loading,
// //     userId,
// //     myGroups,
// //     loadDiscoverGroups,
// //   ]);

// //   /* =======================================================
// //      REFRESH WHEN USER RETURNS TO PAGE
// //   ======================================================= */

// //   useEffect(() => {
// //     const refresh = () => {
// //       loadMyGroups();
// //     };

// //     window.addEventListener(
// //       "focus",
// //       refresh
// //     );

// //     const visibilityHandler = () => {
// //       if (
// //         document.visibilityState ===
// //         "visible"
// //       ) {
// //         refresh();
// //       }
// //     };

// //     document.addEventListener(
// //       "visibilitychange",
// //       visibilityHandler
// //     );

// //     return () => {
// //       window.removeEventListener(
// //         "focus",
// //         refresh
// //       );

// //       document.removeEventListener(
// //         "visibilitychange",
// //         visibilityHandler
// //       );
// //     };
// //   }, [loadMyGroups]);

// //   /* =======================================================
// //      DISCOVER FILTERING
// //   ======================================================= */

// //   const filteredDiscover =
// //     useMemo(() => {
// //       let result = [
// //         ...discoverGroups,
// //       ];

// //       const query =
// //         search.trim().toLowerCase();

// //       if (query) {
// //         result = result.filter(
// //           (group) => {
// //             const name =
// //               String(
// //                 group.name || ""
// //               ).toLowerCase();

// //             const description =
// //               String(
// //                 group.description || ""
// //               ).toLowerCase();

// //             return (
// //               name.includes(query) ||
// //               description.includes(query)
// //             );
// //           }
// //         );
// //       }

// //       if (filter === "verified") {
// //         result =
// //           result.filter(
// //             isVerified
// //           );
// //       }

// //       if (filter === "active") {
// //         result =
// //           result.filter(
// //             (group) =>
// //               String(
// //                 group.status || ""
// //               ).toLowerCase() ===
// //               "active"
// //           );
// //       }

// //       /*
// //        * Kolo Verified groups first.
// //        */
// //       result.sort(
// //         (a, b) =>
// //           Number(
// //             isVerified(b)
// //           ) -
// //           Number(
// //             isVerified(a)
// //           )
// //       );

// //       return result;
// //     }, [
// //       discoverGroups,
// //       search,
// //       filter,
// //     ]);

// //   /* =======================================================
// //      SUMMARY
// //   ======================================================= */

// //   const verifiedDiscoverCount =
// //     discoverGroups.filter(
// //       isVerified
// //     ).length;

// //   const activeDiscoverCount =
// //     discoverGroups.filter(
// //       (group) =>
// //         String(
// //           group.status || ""
// //         ).toLowerCase() ===
// //         "active"
// //     ).length;

// //   /* =======================================================
// //      LOADING
// //   ======================================================= */

// //   if (loading) {
// //     return (
// //       <div className="groupsLoading">
// //         <div className="loadingMark">
// //           K
// //         </div>

// //         <div className="loadingTitle">
// //           Loading your groups
// //         </div>

// //         <div className="loadingSub">
// //           Preparing your Kolo community view...
// //         </div>

// //         <style jsx>{`
// //           .groupsLoading {
// //             min-height: 65vh;
// //             display: flex;
// //             flex-direction: column;
// //             align-items: center;
// //             justify-content: center;
// //             color: ${MUTED};
// //             font-family:
// //               Inter,
// //               Geist,
// //               system-ui,
// //               sans-serif;
// //           }

// //           .loadingMark {
// //             width: 48px;
// //             height: 48px;
// //             display: grid;
// //             place-items: center;
// //             margin-bottom: 15px;
// //             border-radius: 14px;
// //             background: ${GREEN};
// //             color: white;
// //             font-size: 19px;
// //             font-weight: 850;
// //             box-shadow:
// //               0 10px 25px
// //               rgba(0, 107, 44, .12);
// //           }

// //           .loadingTitle {
// //             color: ${NAVY};
// //             font-size: 14px;
// //             font-weight: 750;
// //           }

// //           .loadingSub {
// //             margin-top: 5px;
// //             font-size: 9px;
// //           }
// //         `}</style>
// //       </div>
// //     );
// //   }

// //   /* =======================================================
// //      PAGE
// //   ======================================================= */

// //   return (
// //     <main className="groupsPage">

// //       {/* TOP BAR */}

// //       <header className="topbar">

// //         <div className="breadcrumbs">
// //           <span>Directory</span>

// //           <span className="material-symbols-outlined">
// //             chevron_right
// //           </span>

// //           <strong>Groups</strong>
// //         </div>

// //         <div className="searchBox">

// //           <span className="material-symbols-outlined">
// //             search
// //           </span>

// //           <input
// //             value={search}
// //             onChange={(event) =>
// //               setSearch(
// //                 event.target.value
// //               )
// //             }
// //             placeholder="Search groups..."
// //           />

// //           {search && (
// //             <button
// //               type="button"
// //               onClick={() =>
// //                 setSearch("")
// //               }
// //               aria-label="Clear search"
// //             >
// //               close
// //             </button>
// //           )}

// //         </div>

// //         <button
// //           type="button"
// //           className="notificationButton"
// //           aria-label="Notifications"
// //         >
// //           <span className="material-symbols-outlined">
// //             notifications
// //           </span>
// //         </button>

// //       </header>


// //       {/* HERO */}

// //       <section className="hero">

// //         <div className="heroContent">

// //           <div className="eyebrow">
// //             KOLO COMMUNITY
// //           </div>

// //           <h1>
// //             Savings groups
// //           </h1>

// //           <p>
// //             Stay connected to the communities
// //             you're saving with and discover
// //             groups that may fit your savings
// //             journey.
// //           </p>

// //         </div>

// //         {isAdmin && (
// //           <Link
// //             href="/groups/create"
// //             className="createButton"
// //           >
// //             <span className="material-symbols-outlined">
// //               add
// //             </span>

// //             Create group
// //           </Link>
// //         )}

// //       </section>


// //       {/* ERROR */}

// //       {error && (
// //         <div className="errorBox">
// //           <div className="errorIcon">
// //             !
// //           </div>

// //           <span>
// //             {error}
// //           </span>

// //           <button
// //             type="button"
// //             onClick={() => {
// //               setError("");
// //               loadMyGroups();
// //             }}
// //           >
// //             Retry
// //           </button>
// //         </div>
// //       )}


// //       {/* TABS */}

// //       <div className="tabs">

// //         <button
// //           type="button"
// //           className={
// //             tab === "mine"
// //               ? "tab active"
// //               : "tab"
// //           }
// //           onClick={() =>
// //             setTab("mine")
// //           }
// //         >
// //           <span className="material-symbols-outlined">
// //             groups
// //           </span>

// //           <span>
// //             My Groups
// //           </span>

// //           <b>
// //             {myGroups.length}
// //           </b>
// //         </button>


// //         <button
// //           type="button"
// //           className={
// //             tab === "discover"
// //               ? "tab active"
// //               : "tab"
// //           }
// //           onClick={() =>
// //             setTab("discover")
// //           }
// //         >
// //           <span className="material-symbols-outlined">
// //             explore
// //           </span>

// //           <span>
// //             Discover
// //           </span>

// //           <b>
// //             {discoverGroups.length}
// //           </b>
// //         </button>

// //       </div>


// //       {/* =====================================================
// //           MY GROUPS
// //       ===================================================== */}

// //       {tab === "mine" && (
// //         <section>

// //           <div className="sectionHeader">

// //             <div>
// //               <div className="sectionEyebrow">
// //                 YOUR COMMUNITY
// //               </div>

// //               <h2>
// //                 Groups you belong to
// //               </h2>

// //               <p>
// //                 Your active savings communities
// //                 and their current status.
// //               </p>
// //             </div>

// //             <button
// //               type="button"
// //               className="discoverButton"
// //               onClick={() =>
// //                 setTab("discover")
// //               }
// //             >
// //               Discover groups

// //               <span className="material-symbols-outlined">
// //                 arrow_forward
// //               </span>
// //             </button>

// //           </div>


// //           {myGroups.length === 0 ? (
// //             <EmptyGroups
// //               isAdmin={isAdmin}
// //               onDiscover={() =>
// //                 setTab("discover")
// //               }
// //             />
// //           ) : (

// //             <div className="grid">

// //               {myGroups.map(
// //                 (group) => (
// //                   <GroupCard
// //                     key={group.id}
// //                     group={group}
// //                     mine
// //                   />
// //                 )
// //               )}

// //             </div>

// //           )}

// //         </section>
// //       )}


// //       {/* =====================================================
// //           DISCOVER
// //       ===================================================== */}

// //       {tab === "discover" && (
// //         <section>

// //           <div className="discoverHeader">

// //             <div className="discoverCopy">

// //               <div className="sectionEyebrow">
// //                 DISCOVER
// //               </div>

// //               <h2>
// //                 Find a savings community
// //               </h2>

// //               <p>
// //                 Explore active groups beyond
// //                 the communities you already
// //                 belong to. Review the group's
// //                 information and Kolo trust
// //                 status before making decisions.
// //               </p>

// //             </div>


// //             <div className="discoverStats">

// //               <div className="discoverStat">
// //                 <strong>
// //                   {discoverGroups.length}
// //                 </strong>

// //                 <span>
// //                   Groups
// //                 </span>
// //               </div>

// //               <div className="discoverDivider" />

// //               <div className="discoverStat">
// //                 <strong>
// //                   {verifiedDiscoverCount}
// //                 </strong>

// //                 <span>
// //                   Verified
// //                 </span>
// //               </div>

// //               <div className="discoverDivider" />

// //               <div className="discoverStat">
// //                 <strong>
// //                   {activeDiscoverCount}
// //                 </strong>

// //                 <span>
// //                   Active
// //                 </span>
// //               </div>

// //             </div>

// //           </div>


// //           {/* FILTERS */}

// //           <div className="filters">

// //             <button
// //               type="button"
// //               className={
// //                 filter === "all"
// //                   ? "filter active"
// //                   : "filter"
// //               }
// //               onClick={() =>
// //                 setFilter("all")
// //               }
// //             >
// //               All groups
// //             </button>

// //             <button
// //               type="button"
// //               className={
// //                 filter === "verified"
// //                   ? "filter active"
// //                   : "filter"
// //               }
// //               onClick={() =>
// //                 setFilter("verified")
// //               }
// //             >
// //               <span className="material-symbols-outlined">
// //                 verified
// //               </span>

// //               Kolo Verified
// //             </button>

// //             <button
// //               type="button"
// //               className={
// //                 filter === "active"
// //                   ? "filter active"
// //                   : "filter"
// //               }
// //               onClick={() =>
// //                 setFilter("active")
// //               }
// //             >
// //               Active
// //             </button>

// //           </div>


// //           {/* DISCOVER CONTENT */}

// //           {discoverLoading ? (

// //             <div className="discoverLoading">

// //               <div className="spinner" />

// //               <strong>
// //                 Finding groups
// //               </strong>

// //               <span>
// //                 Checking available communities...
// //               </span>

// //             </div>

// //           ) : filteredDiscover.length === 0 ? (

// //             <div className="noResults">

// //               <div className="noResultsIcon">
// //                 <span className="material-symbols-outlined">
// //                   search_off
// //                 </span>
// //               </div>

// //               <h3>
// //                 No groups found
// //               </h3>

// //               <p>
// //                 Try a different search or
// //                 filter. New communities will
// //                 appear here when available.
// //               </p>

// //               {(search ||
// //                 filter !== "all") && (
// //                 <button
// //                   type="button"
// //                   onClick={() => {
// //                     setSearch("");
// //                     setFilter("all");
// //                   }}
// //                 >
// //                   Clear filters
// //                 </button>
// //               )}

// //             </div>

// //           ) : (

// //             <div className="grid">

// //               {filteredDiscover.map(
// //                 (group) => (
// //                   <GroupCard
// //                     key={group.id}
// //                     group={group}
// //                   />
// //                 )
// //               )}

// //             </div>

// //           )}

// //         </section>
// //       )}


// //       {/* TRUST NOTE */}

// //       <div className="trustFooter">

// //         <span className="material-symbols-outlined">
// //           verified_user
// //         </span>

// //         <div>

// //           <strong>
// //             Understanding Kolo Verification
// //           </strong>

// //           <p>
// //             Kolo Verified means the group's
// //             submitted cooperative and
// //             administrator information has
// //             completed Kolo's review process.
// //             It is a trust signal, not a guarantee
// //             against financial loss.
// //           </p>

// //         </div>

// //       </div>


// //       <style jsx global>{`

// //         * {
// //           box-sizing: border-box;
// //         }

// //         .groupsPage {
// //           width: 100%;
// //           max-width: 1280px;
// //           margin: 0 auto;
// //           padding: 0 0 60px;

// //           color: ${NAVY};

// //           font-family:
// //             Inter,
// //             Geist,
// //             system-ui,
// //             -apple-system,
// //             BlinkMacSystemFont,
// //             "Segoe UI",
// //             sans-serif;
// //         }


// //         /* =====================================================
// //            TOP BAR
// //         ===================================================== */

// //         .topbar {
// //           min-height: 66px;

// //           display: grid;
// //           grid-template-columns:
// //             1fr
// //             minmax(280px, 440px)
// //             1fr;

// //           align-items: center;

// //           gap: 20px;

// //           margin-bottom: 42px;

// //           border-bottom:
// //             1px solid
// //             rgba(189, 202, 186, .35);
// //         }

// //         .breadcrumbs {
// //           display: flex;
// //           align-items: center;
// //           gap: 6px;

// //           color: ${MUTED};

// //           font-size: 10px;
// //           font-weight: 600;
// //         }

// //         .breadcrumbs strong {
// //           color: ${GREEN};
// //         }

// //         .breadcrumbs
// //         .material-symbols-outlined {
// //           font-size: 14px;
// //         }


// //         .searchBox {
// //           position: relative;
// //         }

// //         .searchBox
// //         > .material-symbols-outlined {
// //           position: absolute;

// //           left: 14px;
// //           top: 50%;

// //           transform:
// //             translateY(-50%);

// //           color: ${MUTED};

// //           font-size: 18px;
// //         }

// //         .searchBox input {
// //           width: 100%;
// //           height: 39px;

// //           padding:
// //             0 40px
// //             0 42px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 999px;

// //           outline: none;

// //           background: #f7f9f8;
// //           color: ${NAVY};

// //           font-family: inherit;
// //           font-size: 10px;

// //           transition:
// //             .18s ease;
// //         }

// //         .searchBox input:focus {
// //           background: white;

// //           border-color:
// //             #9bc4a9;

// //           box-shadow:
// //             0 0 0 3px
// //             ${GREEN_SOFT};
// //         }

// //         .searchBox button {
// //           position: absolute;

// //           right: 10px;
// //           top: 50%;

// //           transform:
// //             translateY(-50%);

// //           border: 0;

// //           background: transparent;

// //           color: ${MUTED};

// //           cursor: pointer;

// //           font-family:
// //             "Material Symbols Outlined";

// //           font-size: 17px;
// //         }

// //         .notificationButton {
// //           justify-self: end;

// //           width: 38px;
// //           height: 38px;

// //           display: grid;
// //           place-items: center;

// //           border: 0;
// //           border-radius: 50%;

// //           background: transparent;

// //           color: ${GREEN};

// //           cursor: pointer;
// //         }


// //         /* =====================================================
// //            HERO
// //         ===================================================== */

// //         .hero {
// //           display: flex;
// //           align-items: flex-end;
// //           justify-content: space-between;

// //           gap: 30px;

// //           margin-bottom: 30px;
// //         }

// //         .heroContent {
// //           max-width: 720px;
// //         }

// //         .eyebrow,
// //         .sectionEyebrow {
// //           color: ${GREEN};

// //           font-size: 7px;
// //           font-weight: 850;

// //           letter-spacing: .16em;
// //         }

// //         .hero h1 {
// //           margin:
// //             8px 0 8px;

// //           color: ${NAVY};

// //           font-size: 34px;
// //           line-height: 1;

// //           letter-spacing:
// //             -.05em;

// //           font-weight: 760;
// //         }

// //         .hero p {
// //           max-width: 680px;

// //           margin: 0;

// //           color: ${TEXT};

// //           font-size: 11px;
// //           line-height: 1.7;
// //         }

// //         .createButton {
// //           min-height: 39px;

// //           display: inline-flex;
// //           align-items: center;
// //           justify-content: center;

// //           gap: 7px;

// //           padding:
// //             0 17px;

// //           border-radius: 999px;

// //           background: ${GREEN};
// //           color: white;

// //           text-decoration: none;

// //           font-size: 9px;
// //           font-weight: 750;

// //           white-space: nowrap;

// //           transition:
// //             transform .18s ease,
// //             background .18s ease,
// //             box-shadow .18s ease;
// //         }

// //         .createButton:hover {
// //           background: ${GREEN_DARK};

// //           transform:
// //             translateY(-1px);

// //           box-shadow:
// //             0 9px 20px
// //             rgba(0, 107, 44, .13);
// //         }

// //         .createButton
// //         .material-symbols-outlined {
// //           font-size: 16px;
// //         }


// //         /* =====================================================
// //            ERROR
// //         ===================================================== */

// //         .errorBox {
// //           display: flex;
// //           align-items: center;

// //           gap: 9px;

// //           margin-bottom: 18px;
// //           padding: 10px 12px;

// //           border:
// //             1px solid
// //             #eadfbd;

// //           border-radius: 9px;

// //           background: #fff8eb;

// //           color: ${GOLD};

// //           font-size: 8px;
// //         }

// //         .errorIcon {
// //           width: 19px;
// //           height: 19px;

// //           display: grid;
// //           place-items: center;

// //           border-radius: 50%;

// //           background: #f1e4bf;

// //           font-weight: 800;
// //         }

// //         .errorBox button {
// //           margin-left: auto;

// //           border: 0;

// //           background: transparent;

// //           color: ${GOLD};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 8px;
// //           font-weight: 800;
// //         }


// //         /* =====================================================
// //            TABS
// //         ===================================================== */

// //         .tabs {
// //           display: flex;
// //           align-items: center;

// //           gap: 2px;

// //           margin-bottom: 27px;

// //           border-bottom:
// //             1px solid
// //             ${BORDER};
// //         }

// //         .tab {
// //           min-height: 43px;

// //           display: flex;
// //           align-items: center;

// //           gap: 7px;

// //           padding:
// //             0 14px;

// //           margin-bottom: -1px;

// //           border: 0;

// //           border-bottom:
// //             2px solid
// //             transparent;

// //           background: transparent;

// //           color: ${MUTED};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 9px;
// //           font-weight: 750;
// //         }

// //         .tab.active {
// //           color: ${GREEN};

// //           border-bottom-color:
// //             ${GREEN};
// //         }

// //         .tab
// //         .material-symbols-outlined {
// //           font-size: 17px;
// //         }

// //         .tab b {
// //           min-width: 18px;

// //           padding:
// //             3px 6px;

// //           border-radius: 999px;

// //           background: #f0f3f1;

// //           font-size: 7px;
// //         }

// //         .tab.active b {
// //           background:
// //             ${GREEN_SOFT};

// //           color:
// //             ${GREEN};
// //         }


// //         /* =====================================================
// //            SECTION HEADER
// //         ===================================================== */

// //         .sectionHeader {
// //           display: flex;
// //           align-items: flex-end;
// //           justify-content: space-between;

// //           gap: 20px;

// //           margin-bottom: 15px;
// //         }

// //         .sectionHeader h2,
// //         .discoverHeader h2 {
// //           margin:
// //             6px 0 5px;

// //           color: ${NAVY};

// //           font-size: 19px;

// //           letter-spacing:
// //             -.035em;

// //           font-weight: 760;
// //         }

// //         .sectionHeader p {
// //           margin: 0;

// //           color: ${MUTED};

// //           font-size: 9px;
// //         }

// //         .discoverButton {
// //           display: inline-flex;
// //           align-items: center;

// //           gap: 5px;

// //           border: 0;

// //           background: transparent;

// //           color: ${GREEN};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 8px;
// //           font-weight: 800;
// //         }

// //         .discoverButton
// //         .material-symbols-outlined {
// //           font-size: 14px;
// //         }


// //         /* =====================================================
// //            DISCOVER HEADER
// //         ===================================================== */

// //         .discoverHeader {
// //           display: flex;
// //           align-items: center;
// //           justify-content: space-between;

// //           gap: 30px;

// //           padding: 20px;

// //           margin-bottom: 14px;

// //           border:
// //             1px solid
// //             #dcebe1;

// //           border-radius: 13px;

// //           background:
// //             linear-gradient(
// //               135deg,
// //               #f0f8f3,
// //               #f8fbf9
// //             );
// //         }

// //         .discoverCopy {
// //           max-width: 650px;
// //         }

// //         .discoverHeader p {
// //           margin: 0;

// //           color: ${TEXT};

// //           font-size: 9px;

// //           line-height: 1.65;
// //         }

// //         .discoverStats {
// //           display: flex;
// //           align-items: center;

// //           gap: 15px;

// //           flex-shrink: 0;
// //         }

// //         .discoverStat {
// //           display: flex;
// //           flex-direction: column;

// //           gap: 3px;
// //         }

// //         .discoverStat strong {
// //           color: ${NAVY};

// //           font-size: 17px;
// //           line-height: 1;
// //         }

// //         .discoverStat span {
// //           color: ${MUTED};

// //           font-size: 7px;
// //           font-weight: 700;
// //         }

// //         .discoverDivider {
// //           width: 1px;
// //           height: 28px;

// //           background:
// //             #d5e1d9;
// //         }


// //         /* =====================================================
// //            FILTERS
// //         ===================================================== */

// //         .filters {
// //           display: flex;
// //           align-items: center;

// //           gap: 6px;

// //           margin-bottom: 17px;
// //         }

// //         .filter {
// //           display: inline-flex;
// //           align-items: center;

// //           gap: 5px;

// //           padding:
// //             7px 11px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 999px;

// //           background: white;

// //           color: ${MUTED};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 7px;
// //           font-weight: 750;

// //           transition:
// //             .16s ease;
// //         }

// //         .filter:hover {
// //           border-color:
// //             #bfd2c5;
// //         }

// //         .filter.active {
// //           border-color:
// //             ${GREEN};

// //           background:
// //             ${GREEN};

// //           color: white;
// //         }

// //         .filter
// //         .material-symbols-outlined {
// //           font-size: 12px;
// //         }


// //         /* =====================================================
// //            GRID
// //         ===================================================== */

// //         .grid {
// //           display: grid;

// //           grid-template-columns:
// //             repeat(
// //               3,
// //               minmax(0, 1fr)
// //             );

// //           gap: 15px;
// //         }


// //         /* =====================================================
// //            GROUP CARD
// //         ===================================================== */

// //         .groupCardLink {
// //           display: block;

// //           height: 100%;

// //           color: inherit;

// //           text-decoration: none;
// //         }

// //         .groupCard {
// //           height: 100%;

// //           display: flex;
// //           flex-direction: column;

// //           gap: 12px;

// //           padding: 17px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 13px;

// //           background: white;

// //           box-shadow:
// //             0 5px 20px
// //             rgba(
// //               15,
// //               23,
// //               42,
// //               .025
// //             );

// //           transition:
// //             transform .18s ease,
// //             box-shadow .18s ease,
// //             border-color .18s ease;
// //         }

// //         .groupCard:hover {
// //           transform:
// //             translateY(-2px);

// //           border-color:
// //             #c6dacd;

// //           box-shadow:
// //             0 15px 34px
// //             rgba(
// //               15,
// //               23,
// //               42,
// //               .065
// //             );
// //         }

// //         .cardTop {
// //           display: flex;
// //           align-items: flex-start;
// //           justify-content: space-between;

// //           gap: 10px;
// //         }

// //         .identity {
// //           min-width: 0;

// //           display: flex;
// //           align-items: center;

// //           gap: 10px;
// //         }

// //         .groupIcon {
// //           width: 44px;
// //           height: 44px;

// //           display: grid;
// //           place-items: center;

// //           flex: 0 0 auto;

// //           border-radius: 11px;

// //           background:
// //             ${GREEN_SOFT};

// //           color:
// //             ${GREEN};
// //         }

// //         .groupIcon
// //         .material-symbols-outlined {
// //           font-size: 22px;
// //         }

// //         .identityText {
// //           min-width: 0;
// //         }

// //         .identityText h3 {
// //           margin:
// //             0 0 4px;

// //           overflow: hidden;

// //           color: ${NAVY};

// //           font-size: 12px;
// //           font-weight: 760;

// //           text-overflow:
// //             ellipsis;

// //           white-space:
// //             nowrap;
// //         }

// //         .identityText span {
// //           display: block;

// //           max-width: 190px;

// //           overflow: hidden;

// //           color: ${MUTED};

// //           font-size: 7px;
// //           font-weight: 600;

// //           text-overflow:
// //             ellipsis;

// //           white-space:
// //             nowrap;
// //         }


// //         /* STATUS */

// //         .status {
// //           padding:
// //             4px 7px;

// //           border-radius: 999px;

// //           font-size: 6px;
// //           font-weight: 850;

// //           white-space: nowrap;
// //         }

// //         .status.active {
// //           background:
// //             ${GREEN_SOFT};

// //           color:
// //             ${GREEN};
// //         }

// //         .status.other {
// //           background:
// //             #f1f3f2;

// //           color:
// //             ${MUTED};
// //         }


// //         /* =====================================================
// //            VERIFICATION
// //         ===================================================== */

// //         .verification {
// //           min-height: 28px;

// //           display: flex;
// //           align-items: center;

// //           gap: 5px;

// //           padding:
// //             0 8px;

// //           border-radius: 7px;

// //           background:
// //             ${GREEN_SOFT};

// //           color:
// //             ${GREEN};

// //           font-size: 7px;
// //           font-weight: 800;
// //         }

// //         .verification.unverified {
// //           background:
// //             #f5f6f5;

// //           color:
// //             ${MUTED};
// //         }

// //         .verification
// //         .material-symbols-outlined {
// //           font-size: 13px;
// //         }


// //         /* =====================================================
// //            INSIGHT
// //         ===================================================== */

// //         .insight {
// //           min-height: 43px;

// //           padding: 9px;

// //           border-radius: 8px;

// //           background:
// //             #fafcf9;

// //           color: ${TEXT};

// //           font-size: 7px;

// //           line-height:
// //             1.55;
// //         }

// //         .insight strong {
// //           color:
// //             ${GREEN};
// //         }


// //         /* =====================================================
// //            STATS
// //         ===================================================== */

// //         .stats {
// //           display: grid;

// //           grid-template-columns:
// //             1fr 1fr;

// //           gap: 10px;

// //           padding:
// //             11px 0;

// //           border-top:
// //             1px solid
// //             #edf0ee;

// //           border-bottom:
// //             1px solid
// //             #edf0ee;
// //         }

// //         .stat span {
// //           display: block;

// //           margin-bottom: 4px;

// //           color: ${MUTED};

// //           font-size: 6px;
// //           font-weight: 800;

// //           letter-spacing:
// //             .04em;
// //         }

// //         .stat strong {
// //           color:
// //             ${NAVY};

// //           font-size: 9px;
// //           font-weight: 760;
// //         }

// //         .stat strong.money {
// //           color:
// //             ${GREEN};
// //         }


// //         /* =====================================================
// //            CAPACITY
// //         ===================================================== */

// //         .capacity {
// //           padding-top: 1px;
// //         }

// //         .capacityHead {
// //           display: flex;
// //           align-items: center;
// //           justify-content: space-between;

// //           margin-bottom: 5px;
// //         }

// //         .capacityHead span {
// //           color: ${MUTED};

// //           font-size: 6px;
// //           font-weight: 800;
// //         }

// //         .capacityHead strong {
// //           color: ${GREEN};

// //           font-size: 7px;
// //         }

// //         .capacityBar {
// //           width: 100%;
// //           height: 4px;

// //           overflow: hidden;

// //           border-radius: 999px;

// //           background:
// //             #edf1ee;
// //         }

// //         .capacityFill {
// //           height: 100%;

// //           border-radius: inherit;

// //           background:
// //             ${GREEN};

// //           transition:
// //             width .4s ease;
// //         }


// //         /* =====================================================
// //            CARD FOOTER
// //         ===================================================== */

// //         .cardBottom {
// //           display: flex;
// //           align-items: center;
// //           justify-content: space-between;

// //           gap: 10px;

// //           margin-top: auto;
// //         }

// //         .location {
// //           min-width: 0;

// //           display: flex;
// //           align-items: center;

// //           gap: 5px;

// //           color: ${MUTED};

// //           font-size: 7px;
// //         }

// //         .location
// //         .material-symbols-outlined {
// //           flex: 0 0 auto;

// //           font-size: 13px;
// //         }

// //         .locationText {
// //           overflow: hidden;

// //           text-overflow:
// //             ellipsis;

// //           white-space:
// //             nowrap;
// //         }

// //         .arrow {
// //           width: 29px;
// //           height: 29px;

// //           display: grid;
// //           place-items: center;

// //           flex: 0 0 auto;

// //           border-radius: 50%;

// //           background:
// //             ${NAVY};

// //           color: white;
// //         }

// //         .arrow
// //         .material-symbols-outlined {
// //           font-size: 15px;
// //         }


// //         /* =====================================================
// //            EMPTY
// //         ===================================================== */

// //         .empty {
// //           padding:
// //             60px 20px;

// //           border:
// //             1px dashed
// //             ${BORDER};

// //           border-radius: 13px;

// //           background: white;

// //           text-align: center;
// //         }

// //         .emptyIcon {
// //           width: 56px;
// //           height: 56px;

// //           display: grid;
// //           place-items: center;

// //           margin:
// //             0 auto 13px;

// //           border-radius: 16px;

// //           background:
// //             #f1f4f2;

// //           color:
// //             ${GREEN};
// //         }

// //         .emptyIcon
// //         .material-symbols-outlined {
// //           font-size: 26px;
// //         }

// //         .empty h3 {
// //           margin:
// //             0 0 5px;

// //           color:
// //             ${NAVY};

// //           font-size: 17px;
// //         }

// //         .empty p {
// //           max-width: 430px;

// //           margin:
// //             0 auto 17px;

// //           color:
// //             ${MUTED};

// //           font-size: 9px;

// //           line-height: 1.65;
// //         }

// //         .emptyActions {
// //           display: flex;
// //           align-items: center;
// //           justify-content: center;

// //           gap: 8px;
// //         }

// //         .emptyActions button,
// //         .emptyActions a {
// //           display: inline-flex;
// //           align-items: center;
// //           justify-content: center;

// //           min-height: 34px;

// //           padding:
// //             0 13px;

// //           border-radius: 8px;

// //           font-family: inherit;

// //           font-size: 8px;
// //           font-weight: 800;

// //           text-decoration: none;

// //           cursor: pointer;
// //         }

// //         .emptyActions button {
// //           border:
// //             1px solid
// //             ${BORDER};

// //           background: white;

// //           color:
// //             ${GREEN};
// //         }

// //         .emptyActions a {
// //           background:
// //             ${GREEN};

// //           color: white;
// //         }


// //         /* =====================================================
// //            DISCOVER LOADING
// //         ===================================================== */

// //         .discoverLoading {
// //           min-height: 250px;

// //           display: flex;
// //           flex-direction: column;

// //           align-items: center;
// //           justify-content: center;

// //           gap: 7px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 13px;

// //           background: white;

// //           color: ${MUTED};

// //           font-size: 9px;
// //         }

// //         .discoverLoading strong {
// //           color: ${NAVY};

// //           font-size: 10px;
// //         }

// //         .spinner {
// //           width: 27px;
// //           height: 27px;

// //           margin-bottom: 4px;

// //           border:
// //             2px solid
// //             #e5ece7;

// //           border-top-color:
// //             ${GREEN};

// //           border-radius: 50%;

// //           animation:
// //             groupSpin .7s
// //             linear infinite;
// //         }

// //         @keyframes groupSpin {
// //           to {
// //             transform:
// //               rotate(360deg);
// //           }
// //         }


// //         /* =====================================================
// //            NO RESULTS
// //         ===================================================== */

// //         .noResults {
// //           min-height: 270px;

// //           display: flex;
// //           flex-direction: column;

// //           align-items: center;
// //           justify-content: center;

// //           padding: 30px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 13px;

// //           background: white;

// //           text-align: center;
// //         }

// //         .noResultsIcon {
// //           width: 49px;
// //           height: 49px;

// //           display: grid;
// //           place-items: center;

// //           border-radius: 14px;

// //           background:
// //             #f2f5f3;

// //           color:
// //             ${MUTED};
// //         }

// //         .noResultsIcon
// //         .material-symbols-outlined {
// //           font-size: 23px;
// //         }

// //         .noResults h3 {
// //           margin:
// //             10px 0 4px;

// //           color:
// //             ${NAVY};

// //           font-size: 15px;
// //         }

// //         .noResults p {
// //           max-width: 390px;

// //           margin: 0;

// //           color:
// //             ${MUTED};

// //           font-size: 8px;

// //           line-height: 1.65;
// //         }

// //         .noResults button {
// //           margin-top: 14px;

// //           min-height: 31px;

// //           padding:
// //             0 12px;

// //           border:
// //             1px solid
// //             ${BORDER};

// //           border-radius: 8px;

// //           background: white;

// //           color:
// //             ${GREEN};

// //           cursor: pointer;

// //           font-family: inherit;

// //           font-size: 8px;
// //           font-weight: 800;
// //         }


// //         /* =====================================================
// //            TRUST FOOTER
// //         ===================================================== */

// //         .trustFooter {
// //           display: flex;
// //           align-items: flex-start;

// //           gap: 9px;

// //           max-width: 760px;

// //           margin-top: 30px;

// //           padding: 13px;

// //           border-radius: 10px;

// //           background:
// //             #f7faf8;
// //         }

// //         .trustFooter
// //         > .material-symbols-outlined {
// //           flex: 0 0 auto;

// //           color:
// //             ${GREEN};

// //           font-size: 17px;
// //         }

// //         .trustFooter strong {
// //           display: block;

// //           margin-bottom: 3px;

// //           color:
// //             ${NAVY};

// //           font-size: 8px;
// //         }

// //         .trustFooter p {
// //           margin: 0;

// //           color:
// //             ${MUTED};

// //           font-size: 7px;

// //           line-height: 1.65;
// //         }


// //         /* =====================================================
// //            RESPONSIVE
// //         ===================================================== */

// //         @media (max-width: 1050px) {

// //           .grid {
// //             grid-template-columns:
// //               repeat(
// //                 2,
// //                 minmax(0, 1fr)
// //               );
// //           }

// //         }


// //         @media (max-width: 760px) {

// //           .groupsPage {
// //             padding:
// //               0 14px 45px;
// //           }

// //           .topbar {
// //             grid-template-columns:
// //               1fr auto;

// //             gap: 12px;

// //             margin-bottom:
// //               30px;
// //           }

// //           .searchBox {
// //             grid-column:
// //               1 / -1;

// //             grid-row: 2;
// //           }

// //           .hero {
// //             align-items:
// //               flex-start;

// //             flex-direction:
// //               column;
// //           }

// //           .createButton {
// //             width: 100%;
// //           }

// //           .grid {
// //             grid-template-columns:
// //               1fr;
// //           }

// //           .discoverHeader {
// //             align-items:
// //               flex-start;

// //             flex-direction:
// //               column;
// //           }

// //           .discoverStats {
// //             width: 100%;
// //           }

// //         }


// //         @media (max-width: 480px) {

// //           .hero h1 {
// //             font-size: 28px;
// //           }

// //           .sectionHeader {
// //             align-items:
// //               flex-start;

// //             flex-direction:
// //               column;
// //           }

// //           .discoverButton {
// //             padding: 0;
// //           }

// //           .tabs {
// //             width: 100%;
// //           }

// //           .tab {
// //             flex: 1;

// //             justify-content:
// //               center;
// //           }

// //           .tab
// //           .material-symbols-outlined {
// //             display: none;
// //           }

// //           .filters {
// //             overflow-x: auto;

// //             flex-wrap:
// //               nowrap;

// //             padding-bottom: 3px;
// //           }

// //           .filter {
// //             flex-shrink: 0;

// //             white-space:
// //               nowrap;
// //           }

// //           .discoverStats {
// //             justify-content:
// //               space-between;
// //           }

// //           .discoverDivider {
// //             height: 24px;
// //           }

// //           .status {
// //             display: none;
// //           }

// //         }

// //       `}</style>

// //     </main>
// //   );
// // }


// // /* =========================================================
// //    GROUP CARD
// // ========================================================= */

// // function GroupCard({
// //   group,
// //   mine = false,
// // }: {
// //   group: Group;
// //   mine?: boolean;
// // }) {
// //   const verified =
// //     isVerified(group);

// //   const members =
// //     numberValue(
// //       group.member_count
// //     );

// //   const maximum =
// //     numberValue(
// //       group.max_members
// //     ) || 20;

// //   const pool =
// //     numberValue(
// //       group.pool_amount
// //     );

// //   const contribution =
// //     numberValue(
// //       group.contribution_amount
// //     );

// //   const capacity =
// //     maximum > 0
// //       ? Math.min(
// //           100,
// //           Math.round(
// //             (members /
// //               maximum) *
// //               100
// //           )
// //         )
// //       : 0;

// //   const status =
// //     String(
// //       group.status ||
// //         "active"
// //     );

// //   const frequency =
// //     "Monthly";

// //   const location =
// //     group.location ||
// //     group.city ||
// //     group.state ||
// //     "Location not provided";

// //   /* =======================================================
// //      INTELLIGENCE
// //   ======================================================= */

// //   let insight =
// //     "Review the group's details before making a decision.";

// //   if (verified) {
// //     if (members >= 10) {
// //       insight =
// //         "Kolo Verified · This is an established group with a strong member base.";
// //     } else if (
// //       capacity >= 80
// //     ) {
// //       insight =
// //         "Kolo Verified · The group is close to its stated membership capacity.";
// //     } else {
// //       insight =
// //         "Kolo Verified · The group's submitted cooperative information has completed Kolo review.";
// //     }
// //   } else if (
// //     status.toLowerCase() ===
// //     "active"
// //   ) {
// //     insight =
// //       "Active group · Check its Kolo verification status and group details before committing funds.";
// //   }

// //   if (
// //     members >= maximum &&
// //     maximum > 0
// //   ) {
// //     insight =
// //       verified
// //         ? "Kolo Verified · The group has reached its stated member capacity."
// //         : "The group has reached its stated member capacity.";
// //   }

// //   return (
// //     <Link
// //       href={`/groups/${group.id}`}
// //       className="groupCardLink"
// //     >
// //       <article className="groupCard">

// //         {/* TOP */}

// //         <div className="cardTop">

// //           <div className="identity">

// //             <div className="groupIcon">
// //               <span className="material-symbols-outlined">
// //                 account_balance
// //               </span>
// //             </div>

// //             <div className="identityText">

// //               <h3>
// //                 {group.name}
// //               </h3>

// //               <span>
// //                 {group.description ||
// //                   "Savings community"}
// //               </span>

// //             </div>

// //           </div>

// //           <span
// //             className={
// //               status.toLowerCase() ===
// //               "active"
// //                 ? "status active"
// //                 : "status other"
// //             }
// //           >
// //             {status}
// //           </span>

// //         </div>


// //         {/* VERIFICATION */}

// //         <div
// //           className={
// //             verified
// //               ? "verification"
// //               : "verification unverified"
// //           }
// //         >

// //           <span className="material-symbols-outlined">
// //             {verified
// //               ? "verified"
// //               : "help_outline"}
// //           </span>

// //           {verified
// //             ? "Kolo Verified"
// //             : "Not Kolo Verified"}

// //         </div>


// //         {/* INSIGHT */}

// //         <div className="insight">

// //           <strong>
// //             Kolo insight:
// //           </strong>{" "}

// //           {insight}

// //         </div>


// //         {/* STATS */}

// //         <div className="stats">

// //           <div className="stat">

// //             <span>
// //               MEMBERS
// //             </span>

// //             <strong>
// //               {members}
// //               {" / "}
// //               {maximum}
// //             </strong>

// //           </div>


// //           <div className="stat">

// //             <span>
// //               CONTRIBUTION
// //             </span>

// //             <strong className="money">
// //               {contribution > 0
// //                 ? formatNaira(
// //                     contribution
// //                   )
// //                 : "Not specified"}
// //             </strong>

// //           </div>


// //           <div className="stat">

// //             <span>
// //               CURRENT POOL
// //             </span>

// //             <strong className="money">
// //               {formatNaira(pool)}
// //             </strong>

// //           </div>


// //           <div className="stat">

// //             <span>
// //               CYCLE
// //             </span>

// //             <strong>
// //               {group.cycle_number
// //                 ? `Cycle ${group.cycle_number}`
// //                 : "Current"}
// //             </strong>

// //           </div>

// //         </div>


// //         {/* CAPACITY */}

// //         <div className="capacity">

// //           <div className="capacityHead">

// //             <span>
// //               GROUP CAPACITY
// //             </span>

// //             <strong>
// //               {capacity}%
// //             </strong>

// //           </div>

// //           <div className="capacityBar">

// //             <div
// //               className="capacityFill"
// //               style={{
// //                 width:
// //                   `${capacity}%`,
// //               }}
// //             />

// //           </div>

// //         </div>


// //         {/* FOOTER */}

// //         <div className="cardBottom">

// //           <div className="location">

// //             <span className="material-symbols-outlined">
// //               location_on
// //             </span>

// //             <span className="locationText">
// //               {location}
// //             </span>

// //           </div>


// //           <div className="arrow">

// //             <span className="material-symbols-outlined">
// //               arrow_forward
// //             </span>

// //           </div>

// //         </div>

// //       </article>
// //     </Link>
// //   );
// // }


// // /* =========================================================
// //    EMPTY STATE
// // ========================================================= */

// // function EmptyGroups({
// //   isAdmin,
// //   onDiscover,
// // }: {
// //   isAdmin: boolean;
// //   onDiscover: () => void;
// // }) {
// //   return (
// //     <div className="empty">

// //       <div className="emptyIcon">

// //         <span className="material-symbols-outlined">
// //           groups
// //         </span>

// //       </div>

// //       <h3>
// //         You haven't joined a group yet
// //       </h3>

// //       <p>
// //         Explore other savings communities
// //         or create a group if you're an
// //         authorized Kolo administrator.
// //       </p>

// //       <div className="emptyActions">

// //         <button
// //           type="button"
// //           onClick={onDiscover}
// //         >
// //           Explore groups
// //         </button>

// //         {isAdmin && (
// //           <Link href="/groups/create">
// //             Create group
// //           </Link>
// //         )}

// //       </div>

// //     </div>
// //   );
// // }

// // "use client";

// // import Link from "next/link";
// // import { useEffect, useState, useCallback } from "react";
// // import { createClient } from "@/lib/supabase/client";

// // export default function GroupsPage() {
// //   const [groups, setGroups] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const supabase = createClient();

// //   const fetchGroups = useCallback(async () => {
// //     const {
// //       data: { user },
// //     } = await supabase.auth.getUser();
// //     if (!user) return;

// //     const { data: memberships } = await supabase
// //       .from("group_members")
// //       .select("group_id, groups(*)")
// //       .eq("user_id", user.id);

// //     const userGroups = memberships?.map((m: any) => m.groups) || [];
// //     setGroups(userGroups);
// //     setLoading(false);
// //   }, [supabase]);

// //   useEffect(() => { fetchGroups(); }, [fetchGroups]);

// //   useEffect(() => {
// //     const handleFocus = () => fetchGroups();
// //     const handleVisibilityChange = () => {
// //       if (document.visibilityState === "visible") fetchGroups();
// //     };
// //     window.addEventListener("focus", handleFocus);
// //     document.addEventListener("visibilitychange", handleVisibilityChange);
// //     return () => {
// //       window.removeEventListener("focus", handleFocus);
// //       document.removeEventListener("visibilitychange", handleVisibilityChange);
// //     };
// //   }, [fetchGroups]);

// //   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// //   if (loading) {
// //     return (
// //       <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>
// //         Loading groups...
// //       </div>
// //     );
// //   }

// //   return (
// //     <>
// //       <TopHeader />
// //       <PageHeading />
// //       <GroupsGrid groups={groups} formatNaira={formatNaira} />
// //     </>
// //   );
// // }

// // /* ===========================
// //    TOP HEADER
// //    =========================== */
// // function TopHeader() {
// //   return (
// //     <header className="groups-topbar" style={{ width: "100%", position: "sticky", top: 0, zIndex: 40, backgroundColor: "rgba(248, 249, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "24px", marginLeft: "-24px", marginRight: "-24px", paddingLeft: "24px", paddingRight: "24px" }}>
// //       <div className="topbar-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", maxWidth: "1280px", margin: "0 auto", width: "100%", gap: "16px" }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
// //           <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
// //             <span>Directory</span>
// //             <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>chevron_right</span>
// //             <span style={{ color: "#006b2c", fontWeight: 700 }}>Groups</span>
// //           </nav>
// //         </div>
// //         <div className="search-wrapper" style={{ flex: 1, maxWidth: "448px", margin: "0 64px", position: "relative" }}>
// //           <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.6)" }}>search</span>
// //           <input type="text" placeholder="Search groups, circles, or funds..." style={{ width: "100%", padding: "8px 16px 8px 48px", backgroundColor: "#eff4ff", border: "none", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", outline: "none", boxSizing: "border-box" }} />
// //         </div>
// //         <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
// //           <button style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: "transparent", color: "#006b2c" }}>
// //             <span className="material-symbols-outlined">notifications</span>
// //           </button>
// //         </div>
// //       </div>
// //       {/* Mobile responsive for top bar */}
// //       <style jsx>{`
// //         @media (max-width: 768px) {
// //           .search-wrapper { display: none !important; }
// //           .topbar-inner { padding: 10px 0 !important; }
// //         }
// //       `}</style>
// //     </header>
// //   );
// // }

// // /* ===========================
// //    PAGE HEADING
// //    =========================== */
// // function PageHeading() {
// //   return (
// //     <div className="page-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px", flexWrap: "wrap", gap: "24px" }}>
// //       <div>
// //         <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Savings Groups</h2>
// //         <p style={{ color: "#3e4a3d", marginTop: "8px" }}>Manage your active circles and explore new investment opportunities.</p>
// //       </div>
// //       <div style={{ display: "flex", gap: "8px" }}>
// //         <Link href="/groups/create" className="create-btn" style={{ padding: "10px 24px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
// //           <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
// //           Create Group
// //         </Link>
// //       </div>
// //       {/* Mobile responsive */}
// //       <style jsx>{`
// //         @media (max-width: 500px) {
// //           .page-heading { flex-direction: column !important; align-items: flex-start !important; }
// //           .create-btn { width: 100%; justify-content: center; }
// //         }
// //       `}</style>
// //     </div>
// //   );
// // }

// // /* ===========================
// //    GROUPS GRID
// //    =========================== */
// // function GroupsGrid({ groups, formatNaira }: { groups: any[]; formatNaira: (amount: number) => string }) {
// //   if (groups.length === 0) {
// //     return (
// //       <div className="empty-state" style={{ textAlign: "center", padding: "80px 24px", color: "#3e4a3d" }}>
// //         <span className="material-symbols-outlined" style={{ fontSize: "64px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>groups</span>
// //         <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "#0b1c30" }}>No groups yet</h3>
// //         <p style={{ fontSize: "14px", color: "#6e7b6c", marginBottom: "24px" }}>Create or join a savings group to get started on your wealth journey.</p>
// //         <Link href="/groups/create" style={{ padding: "12px 32px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "12px", fontWeight: 600, fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "'Geist', sans-serif" }}>
// //           <span className="material-symbols-outlined">add</span>
// //           Create Your First Group
// //         </Link>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="groups-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
// //       {groups.map((group) => (
// //         <Link key={group.id} href={`/groups/${group.id}`} className="group-card-link" style={{ textDecoration: "none", color: "inherit" }}>
// //           <div className="group-card" style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.5)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", cursor: "pointer", transition: "all 0.3s", height: "100%" }}
// //             onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1)"; }}
// //             onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(15, 23, 42, 0.04)"; }}>
            
// //             <div className="card-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
// //               <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                 <div style={{ width: "48px", height: "48px", borderRadius: "8px", backgroundColor: "rgba(0, 107, 44, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //                   <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "28px" }}>account_balance</span>
// //                 </div>
// //                 <div style={{ minWidth: 0 }}>
// //                   <h3 className="group-name" style={{ fontSize: "18px", fontWeight: 600, color: "#0b1c30", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</h3>
// //                   <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "rgba(62, 74, 61, 0.7)", textTransform: "uppercase" }}>{group.description || "Savings Group"}</span>
// //                 </div>
// //               </div>
// //               <span className="status-badge" style={{ backgroundColor: "rgba(0, 107, 44, 0.1)", color: "#006b2c", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif", textTransform: "uppercase", flexShrink: 0 }}>{group.status || "ACTIVE"}</span>
// //             </div>

// //             <div className="card-stats" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: "16px 0", borderTop: "1px solid rgba(189, 202, 186, 0.2)", borderBottom: "1px solid rgba(189, 202, 186, 0.2)" }}>
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Members</p>
// //                 <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30", display: "flex", alignItems: "center", gap: "8px" }}>
// //                   <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>groups</span> {group.member_count || 0} / {group.max_members || 20}
// //                 </p>
// //               </div>
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Pool Value</p>
// //                 <p style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#006b2c" }}>{formatNaira(group.pool_amount || 0)}</p>
// //               </div>
// //             </div>

// //             <div className="card-bottom" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
// //               <div style={{ flex: 1 }}>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d", marginBottom: "8px" }}>Cycle Progress</p>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                   <div style={{ position: "relative", width: "48px", height: "48px" }}>
// //                     <svg width="48" height="48">
// //                       <circle cx="24" cy="24" r="20" fill="transparent" stroke="#dce9ff" strokeWidth="4" />
// //                       <circle cx="24" cy="24" r="20" fill="transparent" stroke="#006b2c" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * ((group.member_count || 0) / (group.max_members || 20))) / 100 * 100} strokeLinecap="round" transform="rotate(-90 24 24)" />
// //                     </svg>
// //                     <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#0b1c30" }}>
// //                       {Math.round(((group.member_count || 0) / (group.max_members || 20)) * 100)}%
// //                     </span>
// //                   </div>
// //                   <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>Cycle {group.cycle_number || 1}</span>
// //                 </div>
// //               </div>
// //               <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#0b1c30", color: "#f8f9ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
// //                 <span className="material-symbols-outlined">arrow_forward</span>
// //               </div>
// //             </div>
// //           </div>
// //         </Link>
// //       ))}

// //       {/* Create New Group */}
// //       <Link href="/groups/create" className="create-card" style={{ border: "2px dashed rgba(189, 202, 186, 0.5)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "250px", cursor: "pointer", textDecoration: "none", color: "inherit", transition: "all 0.2s" }}
// //         onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)"; e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)"; }}
// //         onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.currentTarget.style.backgroundColor = "transparent"; }}>
// //         <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#dce9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //           <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>add</span>
// //         </div>
// //         <div style={{ textAlign: "center" }}>
// //           <h3 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Create New Group</h3>
// //           <p style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", color: "#3e4a3d", maxWidth: "200px", margin: "0 auto" }}>Start a private or public savings circle with custom rules.</p>
// //         </div>
// //       </Link>

// //       {/* Mobile responsive styles for Grid */}
// //       <style jsx>{`
// //         @media (max-width: 1100px) {
// //           .groups-grid { grid-template-columns: repeat(2, 1fr) !important; }
// //         }
// //         @media (max-width: 700px) {
// //           .groups-grid { grid-template-columns: 1fr !important; }
// //           .group-card { padding: 20px !important; }
// //           .group-name { font-size: 16px !important; }
// //           .card-stats { gap: 12px !important; }
// //           .create-card { min-height: 200px !important; }
// //         }
// //         @media (max-width: 400px) {
// //           .card-top { flex-direction: column !important; gap: 8px !important; }
// //           .status-badge { align-self: flex-start !important; }
// //           .card-bottom { flex-direction: column !important; gap: 12px !important; align-items: flex-start !important; }
// //         }
// //       `}</style>
// //     </div>
// //   );
// // }




// // "use client";

// // import Link from "next/link";
// // import { useEffect, useState, useCallback } from "react";
// // import { createClient } from "@/lib/supabase/client";

// // export default function GroupsPage() {
// //   const [groups, setGroups] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const supabase = createClient();

// //   const fetchGroups = useCallback(async () => {
// //     const {
// //       data: { user },
// //     } = await supabase.auth.getUser();
// //     if (!user) return;

// //     const { data: memberships } = await supabase
// //       .from("group_members")
// //       .select("group_id, groups(*)")
// //       .eq("user_id", user.id);

// //     const userGroups = memberships?.map((m: any) => m.groups) || [];
// //     setGroups(userGroups);
// //     setLoading(false);
// //   }, [supabase]);

// //   // Initial fetch
// //   useEffect(() => {
// //     fetchGroups();
// //   }, [fetchGroups]);

// //   // 🔥 Refresh on tab focus and back navigation
// //   useEffect(() => {
// //     const handleFocus = () => fetchGroups();
// //     const handleVisibilityChange = () => {
// //       if (document.visibilityState === "visible") fetchGroups();
// //     };

// //     window.addEventListener("focus", handleFocus);
// //     document.addEventListener("visibilitychange", handleVisibilityChange);

// //     return () => {
// //       window.removeEventListener("focus", handleFocus);
// //       document.removeEventListener("visibilitychange", handleVisibilityChange);
// //     };
// //   }, [fetchGroups]);

// //   const formatNaira = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

// //   if (loading) {
// //     return (
// //       <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", fontFamily: "'Inter', sans-serif", color: "#3e4a3d", fontSize: "16px" }}>
// //         Loading groups...
// //       </div>
// //     );
// //   }

// //   return (
// //     <>
// //       <TopHeader />
// //       <PageHeading />
// //       <GroupsGrid groups={groups} formatNaira={formatNaira} />
// //     </>
// //   );
// // }

// // /* ===========================
// //    TOP HEADER
// //    =========================== */
// // function TopHeader() {
// //   return (
// //     <header style={{ width: "100%", position: "sticky", top: 0, zIndex: 40, backgroundColor: "rgba(248, 249, 255, 0.7)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(189, 202, 186, 0.3)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "24px", marginLeft: "-24px", marginRight: "-24px", paddingLeft: "24px", paddingRight: "24px" }}>
// //       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
// //         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //           <nav style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#3e4a3d" }}>
// //             <span>Directory</span>
// //             <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>chevron_right</span>
// //             <span style={{ color: "#006b2c", fontWeight: 700 }}>Groups</span>
// //           </nav>
// //         </div>
// //         <div style={{ flex: 1, maxWidth: "448px", margin: "0 64px", position: "relative" }}>
// //           <span className="material-symbols-outlined" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(62, 74, 61, 0.6)" }}>search</span>
// //           <input type="text" placeholder="Search groups, circles, or funds..." style={{ width: "100%", padding: "8px 16px 8px 48px", backgroundColor: "#eff4ff", border: "none", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", outline: "none", boxSizing: "border-box" }} />
// //         </div>
// //         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //           <button style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "none", cursor: "pointer", backgroundColor: "transparent", color: "#006b2c" }}>
// //             <span className="material-symbols-outlined">notifications</span>
// //           </button>
// //         </div>
// //       </div>
// //     </header>
// //   );
// // }

// // /* ===========================
// //    PAGE HEADING
// //    =========================== */
// // function PageHeading() {
// //   return (
// //     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "40px", flexWrap: "wrap", gap: "24px" }}>
// //       <div>
// //         <h2 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Savings Groups</h2>
// //         <p style={{ color: "#3e4a3d", marginTop: "8px" }}>Manage your active circles and explore new investment opportunities.</p>
// //       </div>
// //       <div style={{ display: "flex", gap: "8px" }}>
// //         <Link href="/groups/create" style={{ padding: "10px 24px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "9999px", fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
// //           <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
// //           Create Group
// //         </Link>
// //       </div>
// //     </div>
// //   );
// // }

// // /* ===========================
// //    GROUPS GRID
// //    =========================== */
// // function GroupsGrid({ groups, formatNaira }: { groups: any[]; formatNaira: (amount: number) => string }) {
// //   if (groups.length === 0) {
// //     return (
// //       <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
// //         <div style={{ gridColumn: "span 3", textAlign: "center", padding: "80px 24px", color: "#3e4a3d" }}>
// //           <span className="material-symbols-outlined" style={{ fontSize: "64px", display: "block", marginBottom: "16px", color: "#bdcaba" }}>groups</span>
// //           <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "#0b1c30" }}>No groups yet</h3>
// //           <p style={{ fontSize: "14px", color: "#6e7b6c", marginBottom: "24px" }}>Create or join a savings group to get started on your wealth journey.</p>
// //           <Link href="/groups/create" style={{ padding: "12px 32px", backgroundColor: "#006b2c", color: "#ffffff", borderRadius: "12px", fontWeight: 600, fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "'Geist', sans-serif" }}>
// //             <span className="material-symbols-outlined">add</span>
// //             Create Your First Group
// //           </Link>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
// //       {groups.map((group) => (
// //         <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: "none", color: "inherit" }}>
// //           <div style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.5)", boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", cursor: "pointer", transition: "all 0.3s", height: "100%" }}
// //             onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1)"; }}
// //             onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(15, 23, 42, 0.04)"; }}>
            
// //             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
// //               <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                 <div style={{ width: "48px", height: "48px", borderRadius: "8px", backgroundColor: "rgba(0, 107, 44, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //                   <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "28px" }}>account_balance</span>
// //                 </div>
// //                 <div>
// //                   <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#0b1c30" }}>{group.name}</h3>
// //                   <span style={{ fontSize: "12px", fontWeight: 600, fontFamily: "'Geist', sans-serif", color: "rgba(62, 74, 61, 0.7)", textTransform: "uppercase" }}>{group.description || "Savings Group"}</span>
// //                 </div>
// //               </div>
// //               <span style={{ backgroundColor: "rgba(0, 107, 44, 0.1)", color: "#006b2c", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700, fontFamily: "'Geist', sans-serif", textTransform: "uppercase" }}>{group.status || "ACTIVE"}</span>
// //             </div>

// //             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", padding: "16px 0", borderTop: "1px solid rgba(189, 202, 186, 0.2)", borderBottom: "1px solid rgba(189, 202, 186, 0.2)" }}>
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Members</p>
// //                 <p style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30", display: "flex", alignItems: "center", gap: "8px" }}>
// //                   <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>groups</span> {group.member_count || 0} / {group.max_members || 20}
// //                 </p>
// //               </div>
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Pool Value</p>
// //                 <p style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Geist', sans-serif", color: "#006b2c" }}>{formatNaira(group.pool_amount || 0)}</p>
// //               </div>
// //             </div>

// //             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
// //               <div style={{ flex: 1 }}>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d", marginBottom: "8px" }}>Cycle Progress</p>
// //                 <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                   <div style={{ position: "relative", width: "48px", height: "48px" }}>
// //                     <svg width="48" height="48">
// //                       <circle cx="24" cy="24" r="20" fill="transparent" stroke="#dce9ff" strokeWidth="4" />
// //                       <circle cx="24" cy="24" r="20" fill="transparent" stroke="#006b2c" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * ((group.member_count || 0) / (group.max_members || 20))) / 100 * 100} strokeLinecap="round" transform="rotate(-90 24 24)" />
// //                     </svg>
// //                     <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: "#0b1c30" }}>
// //                       {Math.round(((group.member_count || 0) / (group.max_members || 20)) * 100)}%
// //                     </span>
// //                   </div>
// //                   <span style={{ fontSize: "14px", fontWeight: 500, fontFamily: "'Geist', sans-serif", color: "#0b1c30" }}>Cycle {group.cycle_number || 1}</span>
// //                 </div>
// //               </div>
// //               <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#0b1c30", color: "#f8f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //                 <span className="material-symbols-outlined">arrow_forward</span>
// //               </div>
// //             </div>
// //           </div>
// //         </Link>
// //       ))}

// //       {/* Create New Group */}
// //       <Link href="/groups/create" style={{ border: "2px dashed rgba(189, 202, 186, 0.5)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "250px", cursor: "pointer", textDecoration: "none", color: "inherit", transition: "all 0.2s" }}
// //         onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)"; e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)"; }}
// //         onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)"; e.currentTarget.style.backgroundColor = "transparent"; }}>
// //         <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#dce9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //           <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>add</span>
// //         </div>
// //         <div style={{ textAlign: "center" }}>
// //           <h3 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Create New Group</h3>
// //           <p style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", color: "#3e4a3d", maxWidth: "200px", margin: "0 auto" }}>Start a private or public savings circle with custom rules.</p>
// //         </div>
// //       </Link>
// //     </div>
// //   );
// // }


// // "use client";

// // import Link from "next/link";
// // import { useEffect, useState } from "react";
// // import { createClient } from "@/lib/supabase/client";

// // export default function GroupsPage() {
// //   const [groups, setGroups] = useState<any[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const supabase = createClient();

// //   useEffect(() => {
// //     async function fetchGroups() {
// //       const {
// //         data: { user },
// //       } = await supabase.auth.getUser();
// //       if (!user) return;

// //       // Get user's group memberships with group details
// //       const { data: memberships } = await supabase
// //         .from("group_members")
// //         .select("group_id, groups(*)")
// //         .eq("user_id", user.id);

// //       const userGroups = memberships?.map((m: any) => m.groups) || [];
// //       setGroups(userGroups);
// //       setLoading(false);
// //     }

// //     fetchGroups();
// //   }, [supabase]);

// //   const formatNaira = (amount: number) => {
// //     return `₦${amount.toLocaleString("en-NG")}`;
// //   };

// //   if (loading) {
// //     return (
// //       <div
// //         style={{
// //           display: "flex",
// //           alignItems: "center",
// //           justifyContent: "center",
// //           minHeight: "60vh",
// //           fontFamily: "'Inter', sans-serif",
// //           color: "#3e4a3d",
// //           fontSize: "16px",
// //         }}
// //       >
// //         Loading groups...
// //       </div>
// //     );
// //   }

// //   return (
// //     <>
// //       <TopHeader />
// //       <PageHeading />
// //       <GroupsGrid groups={groups} formatNaira={formatNaira} />
// //     </>
// //   );
// // }

// // /* ===========================
// //    TOP HEADER
// //    =========================== */
// // function TopHeader() {
// //   return (
// //     <header
// //       style={{
// //         width: "100%",
// //         position: "sticky",
// //         top: 0,
// //         zIndex: 40,
// //         backgroundColor: "rgba(248, 249, 255, 0.7)",
// //         backdropFilter: "blur(12px)",
// //         borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
// //         boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
// //         marginBottom: "24px",
// //         marginLeft: "-24px",
// //         marginRight: "-24px",
// //         paddingLeft: "24px",
// //         paddingRight: "24px",
// //       }}
// //     >
// //       <div
// //         style={{
// //           display: "flex",
// //           justifyContent: "space-between",
// //           alignItems: "center",
// //           padding: "16px 0",
// //           maxWidth: "1280px",
// //           margin: "0 auto",
// //           width: "100%",
// //         }}
// //       >
// //         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //           <nav
// //             style={{
// //               display: "flex",
// //               alignItems: "center",
// //               gap: "8px",
// //               fontSize: "14px",
// //               lineHeight: "20px",
// //               letterSpacing: "0.01em",
// //               fontWeight: 500,
// //               fontFamily: "'Geist', sans-serif",
// //               color: "#3e4a3d",
// //             }}
// //           >
// //             <span>Directory</span>
// //             <span
// //               className="material-symbols-outlined"
// //               style={{ fontSize: "16px" }}
// //             >
// //               chevron_right
// //             </span>
// //             <span style={{ color: "#006b2c", fontWeight: 700 }}>Groups</span>
// //           </nav>
// //         </div>

// //         <div
// //           style={{
// //             flex: 1,
// //             maxWidth: "448px",
// //             margin: "0 64px",
// //             position: "relative",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{
// //               position: "absolute",
// //               left: "16px",
// //               top: "50%",
// //               transform: "translateY(-50%)",
// //               color: "rgba(62, 74, 61, 0.6)",
// //             }}
// //           >
// //             search
// //           </span>
// //           <input
// //             type="text"
// //             placeholder="Search groups, circles, or funds..."
// //             style={{
// //               width: "100%",
// //               padding: "8px 16px 8px 48px",
// //               backgroundColor: "#eff4ff",
// //               border: "none",
// //               borderRadius: "9999px",
// //               fontSize: "14px",
// //               lineHeight: "20px",
// //               letterSpacing: "0.01em",
// //               fontWeight: 500,
// //               fontFamily: "'Geist', sans-serif",
// //               outline: "none",
// //               boxSizing: "border-box",
// //             }}
// //           />
// //         </div>

// //         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //           <button
// //             style={{
// //               width: "40px",
// //               height: "40px",
// //               display: "flex",
// //               alignItems: "center",
// //               justifyContent: "center",
// //               borderRadius: "50%",
// //               border: "none",
// //               cursor: "pointer",
// //               backgroundColor: "transparent",
// //               color: "#006b2c",
// //               transition: "background-color 0.2s",
// //             }}
// //           >
// //             <span className="material-symbols-outlined">notifications</span>
// //           </button>
// //           <button
// //             style={{
// //               width: "40px",
// //               height: "40px",
// //               display: "flex",
// //               alignItems: "center",
// //               justifyContent: "center",
// //               borderRadius: "50%",
// //               border: "none",
// //               cursor: "pointer",
// //               backgroundColor: "transparent",
// //               color: "#006b2c",
// //               transition: "background-color 0.2s",
// //             }}
// //           >
// //             <span className="material-symbols-outlined">help</span>
// //           </button>
// //           <div
// //             style={{
// //               height: "32px",
// //               width: "1px",
// //               backgroundColor: "rgba(189, 202, 186, 0.3)",
// //               margin: "0 8px",
// //             }}
// //           />
// //           <img
// //             style={{
// //               width: "32px",
// //               height: "32px",
// //               borderRadius: "50%",
// //               border: "1px solid rgba(0, 107, 44, 0.2)",
// //               objectFit: "cover",
// //             }}
// //             alt="Profile"
// //             src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcm2nWD1H3lZMlb7DyDTGVhIKgnqner9pz_b8bSqtx89-9K-OTQo6X92ULuQ7y2DN6fPEXmMk6HSfZU1eMFFBH__DmmB_20oz8frPnblDA8G5aavSOa3C8sE6c5s3szjyQOn4TnYxasotUQ3flmHTq2BKkSKjB6P6uowIbhMk7B63w60UcNozn3u94OYagFaC9DXaB-HxtSf1qGzlAyW7SNIVQpqMKEm6Za1UfUUunsu50z0fvsItjo6Y7hrkzGKwv7hP1q-YlFV0Q"
// //           />
// //         </div>
// //       </div>
// //     </header>
// //   );
// // }

// // /* ===========================
// //    PAGE HEADING
// //    =========================== */
// // function PageHeading() {
// //   return (
// //     <div
// //       style={{
// //         display: "flex",
// //         justifyContent: "space-between",
// //         alignItems: "flex-end",
// //         marginBottom: "40px",
// //         flexWrap: "wrap",
// //         gap: "24px",
// //       }}
// //     >
// //       <div>
// //         <h2
// //           style={{
// //             fontSize: "24px",
// //             lineHeight: "32px",
// //             letterSpacing: "-0.01em",
// //             fontWeight: 600,
// //             fontFamily: "'Inter', sans-serif",
// //             color: "#0b1c30",
// //           }}
// //         >
// //           Savings Groups
// //         </h2>
// //         <p style={{ color: "#3e4a3d", marginTop: "8px" }}>
// //           Manage your active circles and explore new investment opportunities.
// //         </p>
// //       </div>
// //       <div style={{ display: "flex", gap: "8px" }}>
// //         <button
// //           style={{
// //             padding: "8px 24px",
// //             borderRadius: "9999px",
// //             border: "1px solid rgba(189, 202, 186, 0.5)",
// //             backgroundColor: "transparent",
// //             fontSize: "14px",
// //             lineHeight: "20px",
// //             letterSpacing: "0.01em",
// //             fontWeight: 500,
// //             fontFamily: "'Geist', sans-serif",
// //             cursor: "pointer",
// //             display: "flex",
// //             alignItems: "center",
// //             gap: "8px",
// //             color: "#3e4a3d",
// //             transition: "background-color 0.2s",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{ fontSize: "18px" }}
// //           >
// //             filter_list
// //           </span>
// //           All Groups
// //         </button>
// //         <button
// //           style={{
// //             padding: "8px 24px",
// //             borderRadius: "9999px",
// //             border: "1px solid rgba(189, 202, 186, 0.5)",
// //             backgroundColor: "transparent",
// //             fontSize: "14px",
// //             lineHeight: "20px",
// //             letterSpacing: "0.01em",
// //             fontWeight: 500,
// //             fontFamily: "'Geist', sans-serif",
// //             cursor: "pointer",
// //             display: "flex",
// //             alignItems: "center",
// //             gap: "8px",
// //             color: "#3e4a3d",
// //             transition: "background-color 0.2s",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{ fontSize: "18px" }}
// //           >
// //             sort
// //           </span>
// //           Latest First
// //         </button>
// //       </div>
// //     </div>
// //   );
// // }

// // /* ===========================
// //    GROUPS GRID
// //    =========================== */
// // function GroupsGrid({
// //   groups,
// //   formatNaira,
// // }: {
// //   groups: any[];
// //   formatNaira: (amount: number) => string;
// // }) {
// //   // If no groups, show empty state
// //   if (groups.length === 0) {
// //     return (
// //       <div
// //         style={{
// //           display: "grid",
// //           gridTemplateColumns: "repeat(3, 1fr)",
// //           gap: "24px",
// //         }}
// //       >
// //         <div
// //           style={{
// //             gridColumn: "span 3",
// //             textAlign: "center",
// //             padding: "80px 24px",
// //             color: "#3e4a3d",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{
// //               fontSize: "64px",
// //               display: "block",
// //               marginBottom: "16px",
// //               color: "#bdcaba",
// //             }}
// //           >
// //             groups
// //           </span>
// //           <h3
// //             style={{
// //               fontSize: "20px",
// //               fontWeight: 600,
// //               marginBottom: "8px",
// //               color: "#0b1c30",
// //             }}
// //           >
// //             No groups yet
// //           </h3>
// //           <p
// //             style={{
// //               fontSize: "14px",
// //               color: "#6e7b6c",
// //               marginBottom: "24px",
// //             }}
// //           >
// //             Create or join a savings group to get started on your wealth journey.
// //           </p>
// //           <Link
// //             href="/groups/create"
// //             style={{
// //               padding: "12px 32px",
// //               backgroundColor: "#006b2c",
// //               color: "#ffffff",
// //               borderRadius: "12px",
// //               border: "none",
// //               cursor: "pointer",
// //               fontWeight: 600,
// //               fontSize: "14px",
// //               textDecoration: "none",
// //               display: "inline-flex",
// //               alignItems: "center",
// //               gap: "8px",
// //               fontFamily: "'Geist', sans-serif",
// //             }}
// //           >
// //             <span className="material-symbols-outlined">add</span>
// //             Create Your First Group
// //           </Link>
// //         </div>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div
// //       style={{
// //         display: "grid",
// //         gridTemplateColumns: "repeat(3, 1fr)",
// //         gap: "24px",
// //       }}
// //     >
// //       {/* Group Cards - Real data from Supabase */}
// //       {groups.map((group) => (
// //         <Link
// //           key={group.id}
// //           href={`/groups/${group.id}`}
// //           style={{
// //             textDecoration: "none",
// //             color: "inherit",
// //           }}
// //         >
// //           <div
// //             style={{
// //               background: "rgba(255, 255, 255, 0.7)",
// //               backdropFilter: "blur(12px)",
// //               border: "1px solid rgba(226, 232, 240, 0.5)",
// //               boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// //               borderRadius: "12px",
// //               padding: "24px",
// //               display: "flex",
// //               flexDirection: "column",
// //               gap: "24px",
// //               cursor: "pointer",
// //               transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
// //               height: "100%",
// //             }}
// //             onMouseEnter={(e) => {
// //               e.currentTarget.style.transform = "translateY(-4px)";
// //               e.currentTarget.style.boxShadow =
// //                 "0 20px 25px -5px rgba(0, 0, 0, 0.1)";
// //             }}
// //             onMouseLeave={(e) => {
// //               e.currentTarget.style.transform = "translateY(0)";
// //               e.currentTarget.style.boxShadow =
// //                 "0 4px 20px rgba(15, 23, 42, 0.04)";
// //             }}
// //           >
// //             {/* Top Row */}
// //             <div
// //               style={{
// //                 display: "flex",
// //                 justifyContent: "space-between",
// //                 alignItems: "flex-start",
// //               }}
// //             >
// //               <div
// //                 style={{ display: "flex", alignItems: "center", gap: "16px" }}
// //               >
// //                 <div
// //                   style={{
// //                     width: "48px",
// //                     height: "48px",
// //                     borderRadius: "8px",
// //                     backgroundColor: "rgba(0, 107, 44, 0.1)",
// //                     display: "flex",
// //                     alignItems: "center",
// //                     justifyContent: "center",
// //                   }}
// //                 >
// //                   <span
// //                     className="material-symbols-outlined"
// //                     style={{
// //                       color: "#006b2c",
// //                       fontSize: "28px",
// //                     }}
// //                   >
// //                     account_balance
// //                   </span>
// //                 </div>
// //                 <div>
// //                   <h3
// //                     style={{
// //                       fontSize: "18px",
// //                       fontWeight: 600,
// //                       color: "#0b1c30",
// //                     }}
// //                   >
// //                     {group.name}
// //                   </h3>
// //                   <span
// //                     style={{
// //                       fontSize: "12px",
// //                       lineHeight: "16px",
// //                       letterSpacing: "0.03em",
// //                       fontWeight: 600,
// //                       fontFamily: "'Geist', sans-serif",
// //                       color: "rgba(62, 74, 61, 0.7)",
// //                       textTransform: "uppercase",
// //                     }}
// //                   >
// //                     {group.description || "Savings Group"}
// //                   </span>
// //                 </div>
// //               </div>
// //               <span
// //                 style={{
// //                   backgroundColor: "rgba(0, 107, 44, 0.1)",
// //                   color: "#006b2c",
// //                   padding: "2px 8px",
// //                   borderRadius: "4px",
// //                   fontSize: "12px",
// //                   lineHeight: "16px",
// //                   letterSpacing: "0.03em",
// //                   fontWeight: 700,
// //                   fontFamily: "'Geist', sans-serif",
// //                   textTransform: "uppercase",
// //                 }}
// //               >
// //                 {group.status || "ACTIVE"}
// //               </span>
// //             </div>

// //             {/* Stats */}
// //             <div
// //               style={{
// //                 display: "grid",
// //                 gridTemplateColumns: "1fr 1fr",
// //                 gap: "16px",
// //                 padding: "16px 0",
// //                 borderTop: "1px solid rgba(189, 202, 186, 0.2)",
// //                 borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
// //               }}
// //             >
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>Members</p>
// //                 <p
// //                   style={{
// //                     fontSize: "14px",
// //                     lineHeight: "20px",
// //                     letterSpacing: "0.01em",
// //                     fontWeight: 500,
// //                     fontFamily: "'Geist', sans-serif",
// //                     color: "#0b1c30",
// //                     display: "flex",
// //                     alignItems: "center",
// //                     gap: "8px",
// //                   }}
// //                 >
// //                   <span
// //                     className="material-symbols-outlined"
// //                     style={{ fontSize: "16px" }}
// //                   >
// //                     groups
// //                   </span>{" "}
// //                   {group.member_count || 0} / {group.max_members || 20}
// //                 </p>
// //               </div>
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
// //                   Pool Value
// //                 </p>
// //                 <p
// //                   style={{
// //                     fontSize: "14px",
// //                     lineHeight: "20px",
// //                     letterSpacing: "0.01em",
// //                     fontWeight: 700,
// //                     fontFamily: "'Geist', sans-serif",
// //                     color: "#006b2c",
// //                   }}
// //                 >
// //                   {formatNaira(group.pool_amount || 0)}
// //                 </p>
// //               </div>
// //             </div>

// //             {/* Progress / Cycle */}
// //             <div
// //               style={{
// //                 display: "flex",
// //                 alignItems: "center",
// //                 justifyContent: "space-between",
// //               }}
// //             >
// //               <div style={{ flex: 1 }}>
// //                 <p
// //                   style={{
// //                     fontSize: "12px",
// //                     color: "#3e4a3d",
// //                     marginBottom: "8px",
// //                   }}
// //                 >
// //                   Cycle Progress
// //                 </p>
// //                 <div
// //                   style={{
// //                     display: "flex",
// //                     alignItems: "center",
// //                     gap: "16px",
// //                   }}
// //                 >
// //                   <div
// //                     style={{
// //                       position: "relative",
// //                       width: "48px",
// //                       height: "48px",
// //                     }}
// //                   >
// //                     <svg width="48" height="48">
// //                       <circle
// //                         cx="24"
// //                         cy="24"
// //                         r="20"
// //                         fill="transparent"
// //                         stroke="#dce9ff"
// //                         strokeWidth="4"
// //                       />
// //                       <circle
// //                         cx="24"
// //                         cy="24"
// //                         r="20"
// //                         fill="transparent"
// //                         stroke="#006b2c"
// //                         strokeWidth="4"
// //                         strokeDasharray="125.6"
// //                         strokeDashoffset={
// //                           125.6 -
// //                           (125.6 *
// //                             ((group.member_count || 0) /
// //                               (group.max_members || 20))) /
// //                             100 *
// //                             100
// //                         }
// //                         strokeLinecap="round"
// //                         transform="rotate(-90 24 24)"
// //                         style={{
// //                           transition: "stroke-dashoffset 1s ease-in-out",
// //                         }}
// //                       />
// //                     </svg>
// //                     <span
// //                       style={{
// //                         position: "absolute",
// //                         inset: 0,
// //                         display: "flex",
// //                         alignItems: "center",
// //                         justifyContent: "center",
// //                         fontSize: "10px",
// //                         fontWeight: 700,
// //                         color: "#0b1c30",
// //                       }}
// //                     >
// //                       {Math.round(
// //                         ((group.member_count || 0) /
// //                           (group.max_members || 20)) *
// //                           100
// //                       )}
// //                       %
// //                     </span>
// //                   </div>
// //                   <span
// //                     style={{
// //                       fontSize: "14px",
// //                       lineHeight: "20px",
// //                       letterSpacing: "0.01em",
// //                       fontWeight: 500,
// //                       fontFamily: "'Geist', sans-serif",
// //                       color: "#0b1c30",
// //                     }}
// //                   >
// //                     Cycle {group.cycle_number || 1}
// //                   </span>
// //                 </div>
// //               </div>
// //               <div
// //                 style={{
// //                   width: "40px",
// //                   height: "40px",
// //                   borderRadius: "50%",
// //                   backgroundColor: "#0b1c30",
// //                   color: "#f8f9ff",
// //                   display: "flex",
// //                   alignItems: "center",
// //                   justifyContent: "center",
// //                   transition: "background-color 0.2s",
// //                 }}
// //               >
// //                 <span className="material-symbols-outlined">arrow_forward</span>
// //               </div>
// //             </div>
// //           </div>
// //         </Link>
// //       ))}

// //       {/* Create New Group Placeholder */}
// //       <Link
// //         href="/groups/create"
// //         style={{
// //           border: "2px dashed rgba(189, 202, 186, 0.5)",
// //           borderRadius: "12px",
// //           padding: "24px",
// //           display: "flex",
// //           flexDirection: "column",
// //           alignItems: "center",
// //           justifyContent: "center",
// //           gap: "16px",
// //           minHeight: "250px",
// //           cursor: "pointer",
// //           textDecoration: "none",
// //           color: "inherit",
// //           transition: "all 0.2s",
// //         }}
// //         onMouseEnter={(e) => {
// //           e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)";
// //           e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)";
// //         }}
// //         onMouseLeave={(e) => {
// //           e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)";
// //           e.currentTarget.style.backgroundColor = "transparent";
// //         }}
// //       >
// //         <div
// //           style={{
// //             width: "64px",
// //             height: "64px",
// //             borderRadius: "50%",
// //             backgroundColor: "#dce9ff",
// //             display: "flex",
// //             alignItems: "center",
// //             justifyContent: "center",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{ color: "#006b2c", fontSize: "32px" }}
// //           >
// //             add
// //           </span>
// //         </div>
// //         <div style={{ textAlign: "center" }}>
// //           <h3
// //             style={{
// //               fontSize: "24px",
// //               fontWeight: 600,
// //               fontFamily: "'Inter', sans-serif",
// //               color: "#0b1c30",
// //             }}
// //           >
// //             Create New Group
// //           </h3>
// //           <p
// //             style={{
// //               fontSize: "12px",
// //               fontFamily: "'Geist', sans-serif",
// //               color: "#3e4a3d",
// //               maxWidth: "200px",
// //               margin: "0 auto",
// //             }}
// //           >
// //             Start a private or public savings circle with custom rules.
// //           </p>
// //         </div>
// //       </Link>
// //     </div>
// //   );
// // }


// // "use client";

// // import Link from "next/link";

// // export default function GroupsPage() {
// //   return (
// //     <>
// //       <TopHeader />
// //       <PageHeading />
// //       <GroupsGrid />
// //     </>
// //   );
// // }

// // /* ===========================
// //    TOP HEADER
// //    =========================== */
// // function TopHeader() {
// //   return (
// //     <header
// //       style={{
// //         width: "100%",
// //         position: "sticky",
// //         top: 0,
// //         zIndex: 40,
// //         backgroundColor: "rgba(248, 249, 255, 0.7)",
// //         backdropFilter: "blur(12px)",
// //         borderBottom: "1px solid rgba(189, 202, 186, 0.3)",
// //         boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
// //         marginBottom: "24px",
// //         marginLeft: "-24px",
// //         marginRight: "-24px",
// //         paddingLeft: "24px",
// //         paddingRight: "24px",
// //       }}
// //     >
// //       <div
// //         style={{
// //           display: "flex",
// //           justifyContent: "space-between",
// //           alignItems: "center",
// //           padding: "16px 0",
// //           maxWidth: "1280px",
// //           margin: "0 auto",
// //           width: "100%",
// //         }}
// //       >
// //         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //           <nav
// //             style={{
// //               display: "flex",
// //               alignItems: "center",
// //               gap: "8px",
// //               fontSize: "14px",
// //               lineHeight: "20px",
// //               letterSpacing: "0.01em",
// //               fontWeight: 500,
// //               fontFamily: "'Geist', sans-serif",
// //               color: "#3e4a3d",
// //             }}
// //           >
// //             <span>Directory</span>
// //             <span
// //               className="material-symbols-outlined"
// //               style={{ fontSize: "16px" }}
// //             >
// //               chevron_right
// //             </span>
// //             <span style={{ color: "#006b2c", fontWeight: 700 }}>Groups</span>
// //           </nav>
// //         </div>

// //         <div
// //           style={{
// //             flex: 1,
// //             maxWidth: "448px",
// //             margin: "0 64px",
// //             position: "relative",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{
// //               position: "absolute",
// //               left: "16px",
// //               top: "50%",
// //               transform: "translateY(-50%)",
// //               color: "rgba(62, 74, 61, 0.6)",
// //             }}
// //           >
// //             search
// //           </span>
// //           <input
// //             type="text"
// //             placeholder="Search groups, circles, or funds..."
// //             style={{
// //               width: "100%",
// //               padding: "8px 16px 8px 48px",
// //               backgroundColor: "#eff4ff",
// //               border: "none",
// //               borderRadius: "9999px",
// //               fontSize: "14px",
// //               lineHeight: "20px",
// //               letterSpacing: "0.01em",
// //               fontWeight: 500,
// //               fontFamily: "'Geist', sans-serif",
// //               outline: "none",
// //               boxSizing: "border-box",
// //             }}
// //           />
// //         </div>

// //         <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //           <button
// //             style={{
// //               width: "40px",
// //               height: "40px",
// //               display: "flex",
// //               alignItems: "center",
// //               justifyContent: "center",
// //               borderRadius: "50%",
// //               border: "none",
// //               cursor: "pointer",
// //               backgroundColor: "transparent",
// //               color: "#006b2c",
// //               transition: "background-color 0.2s",
// //             }}
// //           >
// //             <span className="material-symbols-outlined">notifications</span>
// //           </button>
// //           <button
// //             style={{
// //               width: "40px",
// //               height: "40px",
// //               display: "flex",
// //               alignItems: "center",
// //               justifyContent: "center",
// //               borderRadius: "50%",
// //               border: "none",
// //               cursor: "pointer",
// //               backgroundColor: "transparent",
// //               color: "#006b2c",
// //               transition: "background-color 0.2s",
// //             }}
// //           >
// //             <span className="material-symbols-outlined">help</span>
// //           </button>
// //           <div
// //             style={{
// //               height: "32px",
// //               width: "1px",
// //               backgroundColor: "rgba(189, 202, 186, 0.3)",
// //               margin: "0 8px",
// //             }}
// //           />
// //           <img
// //             style={{
// //               width: "32px",
// //               height: "32px",
// //               borderRadius: "50%",
// //               border: "1px solid rgba(0, 107, 44, 0.2)",
// //               objectFit: "cover",
// //             }}
// //             alt="Profile"
// //             src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcm2nWD1H3lZMlb7DyDTGVhIKgnqner9pz_b8bSqtx89-9K-OTQo6X92ULuQ7y2DN6fPEXmMk6HSfZU1eMFFBH__DmmB_20oz8frPnblDA8G5aavSOa3C8sE6c5s3szjyQOn4TnYxasotUQ3flmHTq2BKkSKjB6P6uowIbhMk7B63w60UcNozn3u94OYagFaC9DXaB-HxtSf1qGzlAyW7SNIVQpqMKEm6Za1UfUUunsu50z0fvsItjo6Y7hrkzGKwv7hP1q-YlFV0Q"
// //           />
// //         </div>
// //       </div>
// //     </header>
// //   );
// // }

// // /* ===========================
// //    PAGE HEADING
// //    =========================== */
// // function PageHeading() {
// //   return (
// //     <div
// //       style={{
// //         display: "flex",
// //         justifyContent: "space-between",
// //         alignItems: "flex-end",
// //         marginBottom: "40px",
// //         flexWrap: "wrap",
// //         gap: "24px",
// //       }}
// //     >
// //       <div>
// //         <h2
// //           style={{
// //             fontSize: "24px",
// //             lineHeight: "32px",
// //             letterSpacing: "-0.01em",
// //             fontWeight: 600,
// //             fontFamily: "'Inter', sans-serif",
// //             color: "#0b1c30",
// //           }}
// //         >
// //           Savings Groups
// //         </h2>
// //         <p style={{ color: "#3e4a3d", marginTop: "8px" }}>
// //           Manage your active circles and explore new investment opportunities.
// //         </p>
// //       </div>
// //       <div style={{ display: "flex", gap: "8px" }}>
// //         <button
// //           style={{
// //             padding: "8px 24px",
// //             borderRadius: "9999px",
// //             border: "1px solid rgba(189, 202, 186, 0.5)",
// //             backgroundColor: "transparent",
// //             fontSize: "14px",
// //             lineHeight: "20px",
// //             letterSpacing: "0.01em",
// //             fontWeight: 500,
// //             fontFamily: "'Geist', sans-serif",
// //             cursor: "pointer",
// //             display: "flex",
// //             alignItems: "center",
// //             gap: "8px",
// //             color: "#3e4a3d",
// //             transition: "background-color 0.2s",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{ fontSize: "18px" }}
// //           >
// //             filter_list
// //           </span>
// //           All Groups
// //         </button>
// //         <button
// //           style={{
// //             padding: "8px 24px",
// //             borderRadius: "9999px",
// //             border: "1px solid rgba(189, 202, 186, 0.5)",
// //             backgroundColor: "transparent",
// //             fontSize: "14px",
// //             lineHeight: "20px",
// //             letterSpacing: "0.01em",
// //             fontWeight: 500,
// //             fontFamily: "'Geist', sans-serif",
// //             cursor: "pointer",
// //             display: "flex",
// //             alignItems: "center",
// //             gap: "8px",
// //             color: "#3e4a3d",
// //             transition: "background-color 0.2s",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{ fontSize: "18px" }}
// //           >
// //             sort
// //           </span>
// //           Latest First
// //         </button>
// //       </div>
// //     </div>
// //   );
// // }

// // /* ===========================
// //    GROUPS GRID
// //    =========================== */
// // function GroupsGrid() {
// //   const groups = [
// //     {
// //       id: "lagos-investment",
// //       title: "Lagos Investment Circle",
// //       subtitle: "Real Estate Focus",
// //       status: "CURRENT",
// //       statusColor: "#006b2c",
// //       icon: "apartment",
// //       iconBg: "rgba(0, 107, 44, 0.1)",
// //       iconColor: "#006b2c",
// //       members: 24,
// //       poolValue: "₦12,500,000",
// //       progress: 70,
// //       raised: "₦8.75M Raised",
// //       progressColor: "#006b2c",
// //     },
// //     {
// //       id: "tech-founders",
// //       title: "Tech Founders Hub",
// //       subtitle: "Venture Backing",
// //       status: "UPCOMING",
// //       statusColor: "#825100",
// //       icon: "rocket_launch",
// //       iconBg: "rgba(86, 94, 116, 0.1)",
// //       iconColor: "#565e74",
// //       members: 12,
// //       poolValue: "₦45,000,000",
// //       progress: 20,
// //       raised: "Waiting for peers",
// //       progressColor: "#825100",
// //     },
// //     {
// //       id: "abuja-professionals",
// //       title: "Abuja Professionals",
// //       subtitle: "Diversified Fund",
// //       status: "CURRENT",
// //       statusColor: "#006b2c",
// //       icon: "account_balance",
// //       iconBg: "rgba(0, 107, 44, 0.1)",
// //       iconColor: "#006b2c",
// //       members: 50,
// //       poolValue: "₦8,200,000",
// //       progress: 95,
// //       raised: "Almost Complete",
// //       progressColor: "#006b2c",
// //     },
// //   ];

// //   return (
// //     <div
// //       style={{
// //         display: "grid",
// //         gridTemplateColumns: "repeat(3, 1fr)",
// //         gap: "24px",
// //       }}
// //     >
// //       {/* Group Cards */}
// //       {groups.map((group) => (
// //         <Link
// //           key={group.id}
// //           href={`/groups/${group.id}`}
// //           style={{
// //             textDecoration: "none",
// //             color: "inherit",
// //           }}
// //         >
// //           <div
// //             className="glass-card-hover"
// //             style={{
// //               background: "rgba(255, 255, 255, 0.7)",
// //               backdropFilter: "blur(12px)",
// //               border: "1px solid rgba(226, 232, 240, 0.5)",
// //               boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// //               borderRadius: "12px",
// //               padding: "24px",
// //               display: "flex",
// //               flexDirection: "column",
// //               gap: "24px",
// //               cursor: "pointer",
// //               transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
// //               height: "100%",
// //             }}
// //             onMouseEnter={(e) => {
// //               e.currentTarget.style.transform = "translateY(-4px)";
// //               e.currentTarget.style.boxShadow =
// //                 "0 20px 25px -5px rgba(0, 0, 0, 0.1)";
// //             }}
// //             onMouseLeave={(e) => {
// //               e.currentTarget.style.transform = "translateY(0)";
// //               e.currentTarget.style.boxShadow =
// //                 "0 4px 20px rgba(15, 23, 42, 0.04)";
// //             }}
// //           >
// //             {/* Top Row */}
// //             <div
// //               style={{
// //                 display: "flex",
// //                 justifyContent: "space-between",
// //                 alignItems: "flex-start",
// //               }}
// //             >
// //               <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
// //                 <div
// //                   style={{
// //                     width: "48px",
// //                     height: "48px",
// //                     borderRadius: "8px",
// //                     backgroundColor: group.iconBg,
// //                     display: "flex",
// //                     alignItems: "center",
// //                     justifyContent: "center",
// //                   }}
// //                 >
// //                   <span
// //                     className="material-symbols-outlined"
// //                     style={{
// //                       color: group.iconColor,
// //                       fontSize: "28px",
// //                     }}
// //                   >
// //                     {group.icon}
// //                   </span>
// //                 </div>
// //                 <div>
// //                   <h3
// //                     style={{
// //                       fontSize: "18px",
// //                       fontWeight: 600,
// //                       color: "#0b1c30",
// //                     }}
// //                   >
// //                     {group.title}
// //                   </h3>
// //                   <span
// //                     style={{
// //                       fontSize: "12px",
// //                       lineHeight: "16px",
// //                       letterSpacing: "0.03em",
// //                       fontWeight: 600,
// //                       fontFamily: "'Geist', sans-serif",
// //                       color: "rgba(62, 74, 61, 0.7)",
// //                       textTransform: "uppercase",
// //                     }}
// //                   >
// //                     {group.subtitle}
// //                   </span>
// //                 </div>
// //               </div>
// //               <span
// //                 style={{
// //                   backgroundColor: `${group.statusColor}10`,
// //                   color: group.statusColor,
// //                   padding: "2px 8px",
// //                   borderRadius: "4px",
// //                   fontSize: "12px",
// //                   lineHeight: "16px",
// //                   letterSpacing: "0.03em",
// //                   fontWeight: 700,
// //                   fontFamily: "'Geist', sans-serif",
// //                 }}
// //               >
// //                 {group.status}
// //               </span>
// //             </div>

// //             {/* Stats */}
// //             <div
// //               style={{
// //                 display: "grid",
// //                 gridTemplateColumns: "1fr 1fr",
// //                 gap: "16px",
// //                 padding: "16px 0",
// //                 borderTop: "1px solid rgba(189, 202, 186, 0.2)",
// //                 borderBottom: "1px solid rgba(189, 202, 186, 0.2)",
// //               }}
// //             >
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
// //                   Member Count
// //                 </p>
// //                 <p
// //                   style={{
// //                     fontSize: "14px",
// //                     lineHeight: "20px",
// //                     letterSpacing: "0.01em",
// //                     fontWeight: 500,
// //                     fontFamily: "'Geist', sans-serif",
// //                     color: "#0b1c30",
// //                     display: "flex",
// //                     alignItems: "center",
// //                     gap: "8px",
// //                   }}
// //                 >
// //                   <span
// //                     className="material-symbols-outlined"
// //                     style={{ fontSize: "16px" }}
// //                   >
// //                     groups
// //                   </span>{" "}
// //                   {group.members} Members
// //                 </p>
// //               </div>
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
// //                   Total Pool Value
// //                 </p>
// //                 <p
// //                   style={{
// //                     fontSize: "14px",
// //                     lineHeight: "20px",
// //                     letterSpacing: "0.01em",
// //                     fontWeight: 700,
// //                     fontFamily: "'Geist', sans-serif",
// //                     color: "#006b2c",
// //                   }}
// //                 >
// //                   {group.poolValue}
// //                 </p>
// //               </div>
// //             </div>

// //             {/* Progress */}
// //             <div
// //               style={{
// //                 display: "flex",
// //                 alignItems: "center",
// //                 justifyContent: "space-between",
// //               }}
// //             >
// //               <div style={{ flex: 1 }}>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d", marginBottom: "8px" }}>
// //                   Goal Progress
// //                 </p>
// //                 <div
// //                   style={{ display: "flex", alignItems: "center", gap: "16px" }}
// //                 >
// //                   <div style={{ position: "relative", width: "48px", height: "48px" }}>
// //                     <svg width="48" height="48">
// //                       <circle
// //                         cx="24"
// //                         cy="24"
// //                         r="20"
// //                         fill="transparent"
// //                         stroke="#dce9ff"
// //                         strokeWidth="4"
// //                       />
// //                       <circle
// //                         cx="24"
// //                         cy="24"
// //                         r="20"
// //                         fill="transparent"
// //                         stroke={group.progressColor}
// //                         strokeWidth="4"
// //                         strokeDasharray="125.6"
// //                         strokeDashoffset={125.6 - (125.6 * group.progress) / 100}
// //                         strokeLinecap="round"
// //                         transform="rotate(-90 24 24)"
// //                         style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
// //                       />
// //                     </svg>
// //                     <span
// //                       style={{
// //                         position: "absolute",
// //                         inset: 0,
// //                         display: "flex",
// //                         alignItems: "center",
// //                         justifyContent: "center",
// //                         fontSize: "10px",
// //                         fontWeight: 700,
// //                         color: "#0b1c30",
// //                       }}
// //                     >
// //                       {group.progress}%
// //                     </span>
// //                   </div>
// //                   <span
// //                     style={{
// //                       fontSize: "14px",
// //                       lineHeight: "20px",
// //                       letterSpacing: "0.01em",
// //                       fontWeight: 500,
// //                       fontFamily: "'Geist', sans-serif",
// //                       color: "#0b1c30",
// //                     }}
// //                   >
// //                     {group.raised}
// //                   </span>
// //                 </div>
// //               </div>
// //               <div
// //                 style={{
// //                   width: "40px",
// //                   height: "40px",
// //                   borderRadius: "50%",
// //                   backgroundColor: "#0b1c30",
// //                   color: "#f8f9ff",
// //                   display: "flex",
// //                   alignItems: "center",
// //                   justifyContent: "center",
// //                   transition: "background-color 0.2s",
// //                 }}
// //               >
// //                 <span className="material-symbols-outlined">arrow_forward</span>
// //               </div>
// //             </div>
// //           </div>
// //         </Link>
// //       ))}

// //       {/* Create New Group Placeholder */}

// // <Link
// //   href="/groups/create"
// //   style={{
// //     border: "2px dashed rgba(189, 202, 186, 0.5)",
// //     borderRadius: "12px",
// //     padding: "24px",
// //     display: "flex",
// //     flexDirection: "column",
// //     alignItems: "center",
// //     justifyContent: "center",
// //     gap: "16px",
// //     minHeight: "250px",
// //     cursor: "pointer",
// //     textDecoration: "none",
// //     color: "inherit",
// //     transition: "all 0.2s",
// //   }}
// //   onMouseEnter={(e) => {
// //     e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)";
// //     e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)";
// //   }}
// //   onMouseLeave={(e) => {
// //     e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)";
// //     e.currentTarget.style.backgroundColor = "transparent";
// //   }}
// // >
// //   <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#dce9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
// //     <span className="material-symbols-outlined" style={{ color: "#006b2c", fontSize: "32px" }}>add</span>
// //   </div>
// //   <div style={{ textAlign: "center" }}>
// //     <h3 style={{ fontSize: "24px", fontWeight: 600, fontFamily: "'Inter', sans-serif", color: "#0b1c30" }}>Create New Group</h3>
// //     <p style={{ fontSize: "12px", fontFamily: "'Geist', sans-serif", color: "#3e4a3d", maxWidth: "200px", margin: "0 auto" }}>
// //       Start a private or public savings circle with custom rules.
// //     </p>
// //   </div>
// // </Link>

// //       {/* <div
// //         style={{
// //           border: "2px dashed rgba(189, 202, 186, 0.5)",
// //           borderRadius: "12px",
// //           padding: "24px",
// //           display: "flex",
// //           flexDirection: "column",
// //           alignItems: "center",
// //           justifyContent: "center",
// //           gap: "16px",
// //           minHeight: "250px",
// //           cursor: "pointer",
// //           transition: "all 0.2s",
// //         }}
// //         onMouseEnter={(e) => {
// //           e.currentTarget.style.borderColor = "rgba(0, 107, 44, 0.5)";
// //           e.currentTarget.style.backgroundColor = "rgba(0, 107, 44, 0.05)";
// //         }}
// //         onMouseLeave={(e) => {
// //           e.currentTarget.style.borderColor = "rgba(189, 202, 186, 0.5)";
// //           e.currentTarget.style.backgroundColor = "transparent";
// //         }}
// //       >
// //         <div
// //           style={{
// //             width: "64px",
// //             height: "64px",
// //             borderRadius: "50%",
// //             backgroundColor: "#dce9ff",
// //             display: "flex",
// //             alignItems: "center",
// //             justifyContent: "center",
// //             transition: "transform 0.2s",
// //           }}
// //         >
// //           <span
// //             className="material-symbols-outlined"
// //             style={{ color: "#006b2c", fontSize: "32px" }}
// //           >
// //             add
// //           </span>
// //         </div>
// //         <div style={{ textAlign: "center" }}>
// //           <h3
// //             style={{
// //               fontSize: "24px",
// //               lineHeight: "32px",
// //               letterSpacing: "-0.01em",
// //               fontWeight: 600,
// //               fontFamily: "'Inter', sans-serif",
// //               color: "#0b1c30",
// //             }}
// //           >
// //             Create New Group
// //           </h3>
// //           <p
// //             style={{
// //               fontSize: "12px",
// //               lineHeight: "16px",
// //               letterSpacing: "0.03em",
// //               fontWeight: 600,
// //               fontFamily: "'Geist', sans-serif",
// //               color: "#3e4a3d",
// //               maxWidth: "200px",
// //               margin: "0 auto",
// //             }}
// //           >
// //             Start a private or public savings circle with custom rules.
// //           </p>
// //         </div>
// //       </div> */}

// //       {/* Featured Group (Large Card) */}
// //       <div
// //         style={{
// //           gridColumn: "span 2",
// //           background: "rgba(255, 255, 255, 0.7)",
// //           backdropFilter: "blur(12px)",
// //           border: "1px solid rgba(226, 232, 240, 0.5)",
// //           boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
// //           borderRadius: "12px",
// //           padding: "24px",
// //           position: "relative",
// //           overflow: "hidden",
// //           cursor: "pointer",
// //           transition: "all 0.2s",
// //         }}
// //       >
// //         {/* Glow */}
// //         <div
// //           style={{
// //             position: "absolute",
// //             top: 0,
// //             right: 0,
// //             width: "256px",
// //             height: "256px",
// //             backgroundColor: "rgba(0, 107, 44, 0.05)",
// //             borderRadius: "50%",
// //             transform: "translate(80px, -80px)",
// //             filter: "blur(48px)",
// //           }}
// //         />

// //         <div
// //           style={{
// //             position: "relative",
// //             zIndex: 10,
// //             display: "flex",
// //             gap: "64px",
// //             height: "100%",
// //           }}
// //         >
// //           <div style={{ flex: 1 }}>
// //             <div
// //               style={{
// //                 display: "flex",
// //                 alignItems: "center",
// //                 gap: "8px",
// //                 marginBottom: "16px",
// //               }}
// //             >
// //               <span
// //                 style={{
// //                   padding: "4px 8px",
// //                   backgroundColor: "#006b2c",
// //                   color: "#ffffff",
// //                   fontSize: "10px",
// //                   fontWeight: 700,
// //                   borderRadius: "4px",
// //                   textTransform: "uppercase",
// //                 }}
// //               >
// //                 AI Recommended
// //               </span>
// //               <span
// //                 style={{
// //                   fontSize: "12px",
// //                   color: "#3e4a3d",
// //                 }}
// //               >
// //                 Matches your profile
// //               </span>
// //             </div>
// //             <h3
// //               style={{
// //                 fontSize: "24px",
// //                 lineHeight: "32px",
// //                 letterSpacing: "-0.01em",
// //                 fontWeight: 600,
// //                 fontFamily: "'Inter', sans-serif",
// //                 marginBottom: "8px",
// //               }}
// //             >
// //               Agro-Export Yield Fund
// //             </h3>
// //             <p
// //               style={{
// //                 fontSize: "16px",
// //                 lineHeight: "24px",
// //                 color: "#3e4a3d",
// //                 marginBottom: "24px",
// //                 maxWidth: "448px",
// //               }}
// //             >
// //               Join 150+ high-net-worth individuals investing in sustainable
// //               cashew and cocoa exports from West Africa. Secured by Kolo
// //               AI Insurance.
// //             </p>
// //             <div style={{ display: "flex", gap: "40px", marginBottom: "24px" }}>
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
// //                   Expected APY
// //                 </p>
// //                 <p
// //                   style={{
// //                     fontSize: "24px",
// //                     lineHeight: "32px",
// //                     letterSpacing: "-0.01em",
// //                     fontWeight: 600,
// //                     fontFamily: "'Inter', sans-serif",
// //                     color: "#006b2c",
// //                   }}
// //                 >
// //                   24.5%
// //                 </p>
// //               </div>
// //               <div>
// //                 <p style={{ fontSize: "12px", color: "#3e4a3d" }}>
// //                   Min. Entry
// //                 </p>
// //                 <p
// //                   style={{
// //                     fontSize: "24px",
// //                     lineHeight: "32px",
// //                     letterSpacing: "-0.01em",
// //                     fontWeight: 600,
// //                     fontFamily: "'Inter', sans-serif",
// //                     color: "#0b1c30",
// //                   }}
// //                 >
// //                   ₦500k
// //                 </p>
// //               </div>
// //             </div>
// //             <button
// //               style={{
// //                 padding: "16px 48px",
// //                 backgroundColor: "#006b2c",
// //                 color: "#ffffff",
// //                 borderRadius: "12px",
// //                 fontWeight: 500,
// //                 fontSize: "14px",
// //                 lineHeight: "20px",
// //                 letterSpacing: "0.01em",
// //                 fontFamily: "'Geist', sans-serif",
// //                 border: "none",
// //                 cursor: "pointer",
// //                 display: "flex",
// //                 alignItems: "center",
// //                 gap: "16px",
// //                 boxShadow: "0 10px 15px -3px rgba(0, 107, 44, 0.2)",
// //                 transition: "all 0.2s",
// //               }}
// //             >
// //               View Opportunity
// //               <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
// //                 trending_up
// //               </span>
// //             </button>
// //           </div>

// //           <div
// //             style={{
// //               width: "192px",
// //               backgroundColor: "#eff4ff",
// //               borderRadius: "12px",
// //               padding: "16px",
// //               display: "flex",
// //               flexDirection: "column",
// //               alignItems: "center",
// //               justifyContent: "center",
// //               textAlign: "center",
// //               flexShrink: 0,
// //             }}
// //           >
// //             <div
// //               style={{
// //                 width: "100%",
// //                 height: "128px",
// //                 borderRadius: "8px",
// //                 backgroundColor: "#dce9ff",
// //                 marginBottom: "16px",
// //                 backgroundImage:
// //                   "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCT0mvAjfrhMLMphXs5rccwLWBrMQUzyQ_47YuBNcziVtS21CfIrxMnU8Q6P6O0AVFvRmrV7Hbkx1Pudzd8zkTv_yR-zJfsRHQhv7CgQP9DD2DVOmy0md5f161JJz-kruWVhqD6NYhjt3NOXXx4DNQH3HCAmcOXA-vrFn7RVDCIvAAxFJcS_1ucgMOKu5aVyOS5azuAmLCuzACMuiVZvxnZ2hMlT7wJWBvHl-9bqgsaAGVf_XvzQaEWkTY9gIrEj0-LXyZ9GpRpjk1B')",
// //                 backgroundSize: "cover",
// //                 backgroundPosition: "center",
// //               }}
// //             />
// //             <div style={{ display: "flex", marginLeft: "8px", marginBottom: "8px" }}>
// //               {[1, 2, 3].map((i) => (
// //                 <div
// //                   key={i}
// //                   style={{
// //                     width: "32px",
// //                     height: "32px",
// //                     borderRadius: "50%",
// //                     border: "2px solid #f8f9ff",
// //                     backgroundColor: "#d3e4fe",
// //                     marginLeft: "-8px",
// //                   }}
// //                 />
// //               ))}
// //               <div
// //                 style={{
// //                   width: "32px",
// //                   height: "32px",
// //                   borderRadius: "50%",
// //                   border: "2px solid #f8f9ff",
// //                   backgroundColor: "#00873a",
// //                   color: "#f7fff2",
// //                   fontSize: "10px",
// //                   display: "flex",
// //                   alignItems: "center",
// //                   justifyContent: "center",
// //                   fontWeight: 700,
// //                   marginLeft: "-8px",
// //                 }}
// //               >
// //                 +147
// //               </div>
// //             </div>
// //             <p
// //               style={{
// //                 fontSize: "10px",
// //                 color: "#3e4a3d",
// //                 fontWeight: 700,
// //                 textTransform: "uppercase",
// //                 letterSpacing: "0.1em",
// //               }}
// //             >
// //               Trusted by Industry Leaders
// //             </p>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }
