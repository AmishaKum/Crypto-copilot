import { expect } from "vitest";
import { configure } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);
// Pages are lazy-loaded; allow time for the dynamic import on slow machines.
configure({ asyncUtilTimeout: 4000 });
