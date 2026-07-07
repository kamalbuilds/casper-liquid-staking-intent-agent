"use client";

import { ClickProvider } from "@make-software/csprclick-ui";
import { CONTENT_MODE, CsprClickInitOptions } from "@make-software/csprclick-core-types";
import React from "react";

const clickOptions: CsprClickInitOptions = {
  appName: "Liquid Staking Intent Agent",
  appId: process.env.NEXT_PUBLIC_CSPR_CLICK_APP_ID || "",
  contentMode: CONTENT_MODE.IFRAME,
  providers: ["casper-wallet", "ledger", "casperdash"],
  chainName: "casper-test",
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <ClickProvider options={clickOptions}>{children}</ClickProvider>;
}
