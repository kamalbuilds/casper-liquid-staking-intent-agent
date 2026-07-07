# Liquid Staking Intent Agent

Turn “earn safely on my CSPR” into a constrained liquid-staking action.

## User

CSPR holders who want staking yield and liquidity without manually comparing validators, LST routes, and DEX liquidity.

## Problem

Casper has fresh liquid-staking contracts and CSPR.trade MCP tooling, but users still need to understand staking, LSTs, swaps, liquidity, and risk. A generic yield dashboard repeats old mistakes. The wedge is intent execution with hard policy bounds.

## Solution

An AI agent receives a user intent, checks liquid-staking and DEX context, proposes a bounded action, and executes only if an Odra policy contract permits it. The demo can stake or route a small testnet amount, then show policy rejection for unsafe size or unsupported recipient.

## Casper primitives

Casper liquid-staking contracts, CSPR.trade MCP, Odra policy contract, CSPR.click signing, CSPR.cloud or explorer proof.

## Demo wow

User says “earn safely on 10 CSPR.” Agent builds a liquid-staking route, executes allowed action, then fails when trying to exceed the user cap.

## MVP scope

Policy contract, one intent form, one liquid-staking or simulated LST route backed by Casper contracts, tx proof, blocked over-limit action, README proof table.

## Main risk

May become another yield optimizer. Keep focus on constrained intent execution, not APY dashboard.
