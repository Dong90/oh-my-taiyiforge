import { Command } from 'commander';
import type { Command as CommanderCommand } from 'commander';

export interface HelpOptions {
  verbose?: boolean;
}

export function createHelpCommand(
  parentCommands: Map<string, CommanderCommand>,
  options?: HelpOptions,
): Command {
  const cmd = new Command('help')
    .exitOverride()
    .description('Show available commands and their descriptions')
    .argument('[name]', 'Command name for detailed help')
    .option('-v, --verbose', 'Show verbose output')
    .action((name) => {
      const cmdOpts = cmd.opts();
      const verbose = cmdOpts.verbose ?? options?.verbose ?? false;

      if (name) {
        const target = parentCommands.get(name);
        if (!target) {
          process.stderr.write(`Unknown command: ${name}\n`);
          if (verbose) {
            process.stderr.write(`Available: ${[...parentCommands.keys()].join(', ')}\n`);
          }
          process.exit(1);
        }
        if (target) target.outputHelp({ error: false });
        return;
      }

      const entries = [...parentCommands.entries()];
      if (entries.length === 0) {
        process.stdout.write('No commands registered.\n');
        return;
      }

      const maxLen = Math.max(...entries.map(([n]) => n.length));

      process.stdout.write('Available commands:\n\n');
      for (const [cmdName, c] of entries) {
        const desc = c.description() || '(no description)';
        process.stdout.write(`  ${cmdName.padEnd(maxLen + 2)} ${desc}\n`);
      }

      if (verbose) {
        process.stdout.write(`\nTotal: ${entries.length} command(s)\n`);
      }
    });
  return cmd;
}
