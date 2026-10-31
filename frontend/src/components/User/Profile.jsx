import PasskeySettings from "./PasskeySettings";
import React, { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useLogout } from "../../utils/useLogout";
import axios from "axios";
import LoadingBar from "react-top-loading-bar";
import MetaData from "../layout/MetaData";
import {
  setupTwoFactorAuth,
  verifyTwoFactorAuth,
  disableTwoFactorAuth,
  clear2FAError,
} from "../../actions/userAction";

import Loader from "../layout/Loader/Loader";
import TrustedDevices from "./TrustedDevices";
import { useMembership } from "../../utils/useIsMember";
const Profile = () => {
  const navigate = useNavigate();
  const { signOut, signingOut } = useLogout();
  const dispatch = useDispatch();

  const {
    user,
    loading,
    isAuthenticated,
    twoFactorLoading,
    twoFactorError,
    twoFactorSetup,
  } = useSelector((state) => state.user);

  const [progress, setProgress] = useState(0);
  const membership = useMembership();
  const [otp, setOtp] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [twoFactorMessage, setTwoFactorMessage] = useState("");

  const onLoaderFinished = () => setProgress(0);

  // --------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setProgress(100);

    const timer = setTimeout(() => setProgress(0), 5000);

    return () => clearTimeout(timer);
  }, [navigate, isAuthenticated]);

  // --------------------------------------------------
  // MEMBERSHIP
  // --------------------------------------------------

  // Membership comes from the shared copy (useMembership above).

  // --------------------------------------------------
  // 2FA ACTIONS
  // --------------------------------------------------

  const handleEnable2FA = () => {
    setOtp("");
    setTwoFactorMessage("");
    dispatch(clear2FAError());

    setShowSetup(true);
    dispatch(setupTwoFactorAuth());
  };

  const handleVerify2FA = (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      return;
    }

    setTwoFactorMessage("");
    dispatch(verifyTwoFactorAuth(otp));
  };

  const handleDisable2FA = (e) => {
    e.preventDefault();

    if (otp.length !== 6) {
      return;
    }

    setTwoFactorMessage("");
    dispatch(disableTwoFactorAuth(otp));
  };

  // --------------------------------------------------
  // CLOSE SETUP AFTER SUCCESSFUL VERIFICATION
  // --------------------------------------------------

  useEffect(() => {
    if (
      showSetup &&
      !twoFactorLoading &&
      !twoFactorError &&
      user?.twoFactorAuth?.enabled
    ) {
      setShowSetup(false);
      setOtp("");

      setTwoFactorMessage(
        "Two-factor authentication has been enabled successfully."
      );
    }
  }, [
    showSetup,
    twoFactorLoading,
    twoFactorError,
    user?.twoFactorAuth?.enabled,
  ]);

  // --------------------------------------------------
  // 2FA STATE
  // --------------------------------------------------

  const is2FAEnabled = user?.twoFactorAuth?.enabled === true;
  const isAdmin = user?.role === "admin";

  const isMember =
    membership?.isActive && membership.status === "ACTIVE";

  // "10 January 2026" rather than the raw ISO date.
  const joinedOn = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  const nextPaymentDate = membership?.nextPaymentDate
    ? new Date(membership.nextPaymentDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Cashfree will confirm the next billing date";

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <Fragment>
      <LoadingBar
        color="#A07C4B"
        progress={progress}
        onLoaderFinished={onLoaderFinished}
      />

      {loading ? (
        <Loader label="Opening your account" />
      ) : (
        <Fragment>
          <MetaData title={`${user?.name} · Maison`} />

          <div className="editorial-shell py-14">
            {/* PAGE HEADER */}
            <div className="mb-12 text-center">
              <p className="eyebrow">Your Account</p>

              <h1 className="heading-display mt-3 text-display">
                My Profile
              </h1>
            </div>

            {/* MAIN PROFILE GRID */}
            <div className="grid gap-14 lg:grid-cols-[320px_1fr]">

              {/* ================================================== */}
              {/* LEFT COLUMN */}
              {/* ================================================== */}

              <div className="flex w-full flex-col gap-6 lg:max-w-[320px]">

                {/* WHO YOU ARE: photo, name and email together, so on a */}
                {/* phone they come first instead of after Logout */}
                <div className="flex items-center gap-5">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-line">
                    <img
                      src={user?.avatar?.url || user?.avatar || "/Profile.png"}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-2xl text-ink">{user?.name}</p>
                    {/* Long addresses wrap after the "@", not mid-domain. */}
                    <p className="mt-1 font-sans text-sm text-ink-soft [overflow-wrap:anywhere]">
                      {String(user?.email || "").split("@").map((part, i) => (
                        <Fragment key={i}>{i > 0 && <>@<wbr /></>}{part}</Fragment>
                      ))}
                    </p>
                    <Link to="/me/update" className="mt-2 inline-block font-sans text-[0.68rem] uppercase tracking-luxe text-brass hover:text-ink">
                      Edit profile
                    </Link>
                  </div>
                </div>

                {/* ACCOUNT OVERVIEW */}
                <div className="border border-line bg-surface p-6">
                  <p className="eyebrow">Account Overview</p>
                  <dl className="mt-5 divide-y divide-line font-sans text-sm">
                    <div className="flex items-center justify-between gap-4 pb-3">
                      <dt className="text-ink-soft">Membership</dt>
                      <dd className="text-right text-xs uppercase tracking-wider text-ink">
                        {isMember ? (
                          membership?.name || "Member"
                        ) : (
                          <Link to="/membership" className="text-brass hover:text-ink">
                            Not a member · Join
                          </Link>
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-ink-soft">Security</dt>
                      <dd className={`text-xs uppercase tracking-wider ${is2FAEnabled ? "text-success" : "text-ink-faint"}`}>
                        {is2FAEnabled ? "2FA on" : "2FA off"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-ink-soft">Account</dt>
                      <dd className="text-xs uppercase tracking-wider text-ink">
                        {user?.role === "admin" ? "Administrator" : "Customer"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 pt-3">
                      <dt className="text-ink-soft">Joined</dt>
                      <dd className="text-xs uppercase tracking-wider text-ink">{joinedOn}</dd>
                    </div>
                  </dl>
                </div>

                {/* ACCOUNT ACTIONS: one list card, then admin, then Logout */}
                <nav aria-label="Account" className="flex flex-col gap-3">
                  <ul className="divide-y divide-line border border-line bg-surface">
                    {[
                      ["/orders", "My Orders"],
                      ["/account/addresses", "Address Book"],
                      ["/password/update", "Change Password"],
                    ].map(([to, label]) => (
                      <li key={to}>
                        <Link
                          to={to}
                          className="group flex items-center justify-between px-6 py-4 font-sans text-[0.72rem] uppercase tracking-luxe text-ink transition-colors hover:text-brass"
                        >
                          {label}
                          <span aria-hidden="true" className="text-ink-faint transition-transform group-hover:translate-x-1 group-hover:text-brass">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  {user?.role === "admin" && (
                    <Link
                      to="/admin/dashboard"
                      className="btn-luxe w-full justify-center bg-brass px-8 py-4 text-white hover:bg-brass-soft"
                    >
                      Admin Dashboard
                    </Link>
                  )}

                  {/* Same flow as the header's Logout */}
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                    className="mt-3 w-full border border-line px-6 py-3 font-sans text-[0.72rem] uppercase tracking-luxe text-ink-soft transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    {signingOut ? "Logging out…" : "Logout"}
                  </button>
                </nav>
              </div>

              {/* ================================================== */}
              {/* RIGHT COLUMN */}
              {/* ================================================== */}

              <div className="flex flex-col">

                <div className="space-y-8">

                  {/* ================================================== */}
                  {/* MEMBERSHIP */}
                  {/* ================================================== */}

                  <div className="border border-brass/40 bg-surface p-5">
                    <p className="eyebrow">
                      {isMember
                        ? "Maison Member"
                        : "Membership"}
                    </p>

                    {isMember ? (
                      <Fragment>
                        <p className="mt-2 font-display text-2xl text-ink">
                          You are a member
                        </p>

                        <p className="mt-2 font-sans text-sm text-ink-soft">
                          {membership.name}
                        </p>

                        <p className="mt-2 font-sans text-sm text-ink-soft">
                          Next payment date:{" "}
                          <strong className="text-ink">
                            {nextPaymentDate}
                          </strong>
                        </p>
                      </Fragment>
                    ) : (
                      <Fragment>
                        <p className="mt-2 font-display text-2xl text-ink">
                          Not a member yet
                        </p>

                        <p className="mt-2 font-sans text-sm text-ink-soft">
                          Explore monthly and yearly membership
                          plans.
                        </p>
                      </Fragment>
                    )}

                    <Link
                      to="/membership"
                      className="btn-outline mt-5 inline-flex"
                    >
                      {isMember
                        ? "Manage Membership"
                        : "View Membership"}
                    </Link>
                  </div>

                  {/* ================================================== */}
                  {/* TWO FACTOR AUTHENTICATION */}
                  {/* ================================================== */}

                  <div className="border border-brass/40 bg-surface p-6">

                    {/* 2FA HEADER */}
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <p className="eyebrow">Security</p>

                        <h2 className="mt-2 font-display text-2xl text-ink">
                          Two-Factor Authentication
                        </h2>

                        <p className="mt-2 max-w-xl font-sans text-sm leading-6 text-ink-soft">
                          {isAdmin
                            ? "Required for administrator accounts, so it can't be turned off."
                            : "Add an extra layer of security to your Maison account using an authenticator app."}
                        </p>
                      </div>

                      {/* STATUS */}
                      <div className="shrink-0">
                        {is2FAEnabled ? (
                          <span className="inline-flex items-center border border-green-700/30 bg-green-50 px-4 py-2 font-sans text-xs uppercase tracking-wider text-green-800">
                            Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center border border-line px-4 py-2 font-sans text-xs uppercase tracking-wider text-ink-faint">
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SUCCESS MESSAGE */}
                    {twoFactorMessage && (
                      <div className="mt-5 border border-green-700/30 bg-green-50 p-4">
                        <p className="font-sans text-sm text-green-800">
                          {twoFactorMessage}
                        </p>
                      </div>
                    )}

                    {/* ERROR MESSAGE */}
                    {twoFactorError && (
                      <div className="mt-5 border border-red-700/30 bg-red-50 p-4">
                        <p className="font-sans text-sm text-red-800">
                          {twoFactorError}
                        </p>
                      </div>
                    )}

                    {/* ================================================== */}
                    {/* ENABLE 2FA */}
                    {/* ================================================== */}

                    {!is2FAEnabled && !showSetup && (
                      <button
                        type="button"
                        onClick={handleEnable2FA}
                        disabled={twoFactorLoading}
                        className="btn-solid mt-6 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {twoFactorLoading
                          ? "Preparing…"
                          : "Enable 2FA"}
                      </button>
                    )}

                    {/* ================================================== */}
                    {/* 2FA SETUP */}
                    {/* ================================================== */}

                    {!is2FAEnabled && showSetup && (
                      <div className="mt-7 border-t border-line pt-7">

                        <div className="grid gap-8 md:grid-cols-[220px_1fr]">

                          {/* QR CODE */}
                          <div className="flex flex-col items-center">

                            {twoFactorSetup?.qrCode ? (
                              <div className="border border-line bg-white p-4">
                                <img
                                  src={twoFactorSetup.qrCode}
                                  alt="2FA QR Code"
                                  className="h-48 w-48"
                                />
                              </div>
                            ) : (
                              <div className="flex h-48 w-48 items-center justify-center border border-line">
                                <span className="font-sans text-xs uppercase tracking-wider text-ink-faint">
                                  Loading QR…
                                </span>
                              </div>
                            )}
                          </div>

                          {/* SETUP DETAILS */}
                          <div>

                            <p className="eyebrow">
                              Step 1
                            </p>

                            <p className="mt-2 font-display text-xl text-ink">
                              Scan the QR code
                            </p>

                            <p className="mt-2 font-sans text-sm leading-6 text-ink-soft">
                              Open Google Authenticator, Microsoft
                              Authenticator, or another TOTP
                              authenticator app and scan this QR code.
                            </p>

                            {/* MANUAL SECRET */}
                            {twoFactorSetup?.secret && (
                              <div className="mt-5">
                                <p className="eyebrow">
                                  Manual Setup Key
                                </p>

                                <div className="mt-2 break-all border border-line bg-white p-3 font-mono text-xs tracking-wider text-ink">
                                  {twoFactorSetup.secret}
                                </div>
                              </div>
                            )}

                            {/* VERIFY FORM */}
                            <form
                              onSubmit={handleVerify2FA}
                              className="mt-7"
                            >
                              <p className="eyebrow">
                                Step 2
                              </p>

                              <p className="mt-2 font-display text-xl text-ink">
                                Verify your authenticator
                              </p>

                              <label
                                htmlFor="enable-2fa-code"
                                className="mt-5 block font-sans text-sm text-ink-soft"
                              >
                                Enter the 6-digit code
                              </label>

                              <input
                                id="enable-2fa-code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => {
                                  const value = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6);

                                  setOtp(value);
                                }}
                                placeholder="000000"
                                className="mt-2 w-full border border-line bg-white px-4 py-3 font-mono text-lg tracking-[0.35em] text-ink outline-none focus:border-brass"
                              />

                              <div className="mt-5 flex flex-wrap gap-3">

                                <button
                                  type="submit"
                                  disabled={
                                    otp.length !== 6 ||
                                    twoFactorLoading
                                  }
                                  className="btn-solid disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {twoFactorLoading
                                    ? "Verifying…"
                                    : "Verify & Enable 2FA"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowSetup(false);
                                    setOtp("");
                                    setTwoFactorMessage("");
                                    dispatch(clear2FAError());
                                  }}
                                  className="btn-outline"
                                >
                                  Cancel
                                </button>

                              </div>
                            </form>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ================================================== */}
                    {/* DISABLE 2FA */}
                    {/* ================================================== */}

                    {is2FAEnabled && !user?.isDemo && <TrustedDevices />}

                    {is2FAEnabled && !isAdmin && !showDisable && (
                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDisable(true);
                            setOtp("");
                            setTwoFactorMessage("");
                            dispatch(clear2FAError());
                          }}
                          className="btn-outline"
                        >
                          Disable 2FA
                        </button>
                      </div>
                    )}

                    {/* DISABLE FORM */}
                    {is2FAEnabled && !isAdmin && showDisable && (
                      <form
                        onSubmit={handleDisable2FA}
                        className="mt-7 border-t border-line pt-7"
                      >
                        <p className="eyebrow">
                          Disable Two-Factor Authentication
                        </p>

                        <p className="mt-2 font-display text-xl text-ink">
                          Confirm with your authenticator
                        </p>

                        <p className="mt-2 font-sans text-sm leading-6 text-ink-soft">
                          Enter the current 6-digit code from your
                          authenticator app to disable 2FA.
                        </p>

                        <label
                          htmlFor="disable-2fa-code"
                          className="mt-5 block font-sans text-sm text-ink-soft"
                        >
                          Authentication code
                        </label>

                        <input
                          id="disable-2fa-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={otp}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6);

                            setOtp(value);
                          }}
                          placeholder="000000"
                          className="mt-2 w-full max-w-sm border border-line bg-white px-4 py-3 font-mono text-lg tracking-[0.35em] text-ink outline-none focus:border-brass"
                        />

                        <div className="mt-5 flex flex-wrap gap-3">

                          <button
                            type="submit"
                            disabled={
                              otp.length !== 6 ||
                              twoFactorLoading
                            }
                            className="btn-solid disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {twoFactorLoading
                              ? "Disabling…"
                              : "Confirm Disable"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setShowDisable(false);
                              setOtp("");
                              setTwoFactorMessage("");
                              dispatch(clear2FAError());
                            }}
                            className="btn-outline"
                          >
                            Cancel
                          </button>

                        </div>
                      </form>
                    )}
                  </div>
                </div>

                <PasskeySettings isDemo={user?.isDemo === true} />

              </div>
            </div>
          </div>
        </Fragment>
      )}
    </Fragment>
  );
};

export default Profile;
