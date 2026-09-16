import React, { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import LoadingBar from "react-top-loading-bar";
import MetaData from "../layout/MetaData";
import {
  setupTwoFactorAuth,
  verifyTwoFactorAuth,
  disableTwoFactorAuth,
  clear2FAError,
} from "../../actions/userAction";

const Profile = () => {
  const navigate = useNavigate();
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
  const [membership, setMembership] = useState(null);
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

  useEffect(() => {
    if (isAuthenticated) {
      axios
        .get("/api/v1/membership/current")
        .then(({ data }) => setMembership(data.membership))
        .catch(() => {});
    }
  }, [isAuthenticated]);

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

  const isMember =
    membership?.isActive && membership.status === "ACTIVE";

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
        <div className="editorial-shell py-32 text-center">
          <p className="font-sans text-[0.72rem] uppercase tracking-luxe text-ink-faint">
            Loading your profile…
          </p>
        </div>
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

              <div className="flex flex-col items-center">

                {/* PROFILE IMAGE */}
                <div className="overflow-hidden rounded-full border border-line">
                  <img
                    src={
                      user?.avatar?.url ||
                      user?.avatar ||
                      "/Profile.png"
                    }
                    alt={user?.name}
                    className="h-56 w-56 object-cover"
                  />
                </div>

                {/* EDIT PROFILE */}
                <Link to="/me/update" className="btn-outline mt-8">
                  Edit Profile
                </Link>

                {/* ================================================== */}
                {/* ACCOUNT OVERVIEW */}
                {/* ================================================== */}

                <div className="mt-10 w-full max-w-[320px] border border-line bg-surface p-6">
                  <p className="eyebrow">Account Overview</p>

                  <div className="mt-5 space-y-4">

                    {/* MEMBERSHIP */}
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <span className="font-sans text-sm text-ink-soft">
                        Membership
                      </span>

                      <span className="font-sans text-xs uppercase tracking-wider text-ink">
                        {isMember ? "Active" : "Inactive"}
                      </span>
                    </div>

                    {/* SECURITY */}
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <span className="font-sans text-sm text-ink-soft">
                        Security
                      </span>

                      <span
                        className={`font-sans text-xs uppercase tracking-wider ${
                          is2FAEnabled
                            ? "text-green-700"
                            : "text-ink-faint"
                        }`}
                      >
                        {is2FAEnabled
                          ? "2FA Enabled"
                          : "2FA Disabled"}
                      </span>
                    </div>

                    {/* ACCOUNT TYPE */}
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <span className="font-sans text-sm text-ink-soft">
                        Account
                      </span>

                      <span className="font-sans text-xs uppercase tracking-wider text-ink">
                        {user?.role === "admin"
                          ? "Administrator"
                          : "Customer"}
                      </span>
                    </div>

                    {/* MEMBER SINCE */}
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-sm text-ink-soft">
                        Member Since
                      </span>

                      <span className="font-sans text-xs uppercase tracking-wider text-ink">
                        {String(user?.createdAt).substring(0, 10)}
                      </span>
                    </div>

                  </div>
                </div>
              </div>

              {/* ================================================== */}
              {/* RIGHT COLUMN */}
              {/* ================================================== */}

              <div className="flex flex-col justify-center">

                <div className="space-y-8">

                  {/* FULL NAME */}
                  <div>
                    <p className="eyebrow">Full Name</p>

                    <p className="mt-2 font-display text-2xl text-ink">
                      {user?.name}
                    </p>
                  </div>

                  <div className="rule-luxe" />

                  {/* EMAIL */}
                  <div>
                    <p className="eyebrow">Email</p>

                    <p className="mt-2 font-display text-2xl text-ink">
                      {user?.email}
                    </p>
                  </div>

                  <div className="rule-luxe" />

                  {/* JOINED ON */}
                  <div>
                    <p className="eyebrow">Joined On</p>

                    <p className="mt-2 font-display text-2xl text-ink">
                      {String(user?.createdAt).substring(0, 10)}
                    </p>
                  </div>

                  <div className="rule-luxe" />

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
                          Add an extra layer of security to your
                          Maison account using an authenticator app.
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

                    {is2FAEnabled && !showDisable && (
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
                    {is2FAEnabled && showDisable && (
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

                {/* ================================================== */}
                {/* ACCOUNT ACTIONS */}
                {/* ================================================== */}

                <div className="mt-12 flex flex-wrap gap-4">

                  <Link to="/orders" className="btn-solid">
                    My Orders
                  </Link>

                  <Link
                    to="/account/addresses"
                    className="btn-outline"
                  >
                    Address Book
                  </Link>

                  <Link
                    to="/password/update"
                    className="btn-outline"
                  >
                    Change Password
                  </Link>

                </div>

                {/* ================================================== */}
                {/* ADMIN */}
                {/* ================================================== */}

                {user?.role === "admin" && (
                  <div className="mt-10 border border-brass/50 bg-surface p-6">

                    <p className="eyebrow">
                      Administrator
                    </p>

                    <p className="mt-2 font-sans text-sm text-ink-soft">
                      You have admin access to this store.
                    </p>

                    <Link
                      to="/admin/dashboard"
                      className="btn-luxe mt-5 inline-flex bg-brass px-8 py-4 text-white hover:bg-brass-soft"
                    >
                      Open Admin Dashboard
                    </Link>

                  </div>
                )}

              </div>
            </div>
          </div>
        </Fragment>
      )}
    </Fragment>
  );
};

export default Profile;
