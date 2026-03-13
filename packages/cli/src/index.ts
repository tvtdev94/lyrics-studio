#!/usr/bin/env node

import { Command } from "commander";
import { createCommand } from "./commands/create.js";
import { subtitleCommand } from "./commands/subtitle.js";
import { parseCommand } from "./commands/parse.js";
import { replaceSubCommand } from "./commands/replace-sub.js";

const program = new Command();

program
  .name("lyrics-studio")
  .description("Create YouTube lyrics videos with Remotion and FFmpeg")
  .version("1.0.0");

program.addCommand(createCommand);
program.addCommand(subtitleCommand);
program.addCommand(parseCommand);
program.addCommand(replaceSubCommand);

program.parse();
