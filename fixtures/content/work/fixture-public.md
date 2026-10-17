---
title: Fixture public study
summary: A public fixture study with a repository link, status badges and a highlighted code sample.
source: public
repo: https://github.com/example/fixture-public
stack: [Playwright, TypeScript]
role: QA engineer
period: 2024–2025
featured: true
featuredOrder: 1
badges:
  - label: tests
    src: https://img.shields.io/badge/tests-passing-brightgreen
    href: https://github.com/example/fixture-public/actions
---

## Context

This fixture stands in for a project whose source is public.

## Problem

The page tests need realistic sections to render.

## Test strategy

The fixture keeps one code sample to prove that highlighting happens at build time.

```ts
const retries: number = 0;
const baseUrl: string = 'http://localhost:4321';
## not a heading
```

## Stack

The fixture lists Playwright and TypeScript.

## Results

The fixture renders all six sections in order.

### A sub-heading

A sub-heading must not count as a section.

## What I'd change

Nothing, because the fixture only exists for the tests.
