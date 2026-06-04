"""Update StatsOverlay.tsx with weather/time controls"""
with open(r'D:\workspace\emergence-world\src\components\UI\StatsOverlay.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update component destructuring
old_sig = '''export const StatsOverlay: React.FC<StatsOverlayProps> = ({
  worldId,
  agentCount,
  eventCount,
  dramaLevel,
  mode,
  onModeChange,
  connected,
  worldTime,
  isSimulating,
  onToggleSimulation,
}) => {'''

new_sig = '''export const StatsOverlay: React.FC<StatsOverlayProps> = ({
  worldId,
  agentCount,
  eventCount,
  dramaLevel,
  mode,
  onModeChange,
  connected,
  worldTime,
  isSimulating,
  onToggleSimulation,
  timeOfDay,
  weather,
  onTimeChange,
  onWeatherChange,
}) => {'''

assert old_sig in content, "signature not found!"
content = content.replace(old_sig, new_sig, 1)

# Find the closing of the last button group and add controls
# The last button group ends with </button>\n          </div>\n        </div>
search = '''            </button>
          </div>
        </div>
      </div>
    </div>
  );
};'''

replace = '''            </button>
          </div>

          <div className="mt-3 pt-2 border-t border-cyan-500/20">
            <div className="text-[10px] text-cyan-400/40 uppercase tracking-wider mb-1.5">Time of Day</div>
            <div className="flex gap-1">
              {(["day", "dusk", "night"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onTimeChange(t)}
                  className={"flex-1 text-[10px] py-1 rounded transition-all font-mono tracking-wider " + (
                    timeOfDay === t
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:bg-gray-700/50"
                  )}
                >
                  {t === "day" ? "SUNNY" : t === "dusk" ? "DUSK" : "NIGHT"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <div className="text-[10px] text-cyan-400/40 uppercase tracking-wider mb-1.5">Weather</div>
            <div className="flex gap-1">
              {(["clear", "rain"] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => onWeatherChange(w)}
                  className={"flex-1 text-[10px] py-1 rounded transition-all font-mono tracking-wider " + (
                    weather === w
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-gray-800/50 text-gray-500 border border-gray-700/50 hover:bg-gray-700/50"
                  )}
                >
                  {w === "clear" ? "CLEAR" : "RAIN"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};'''

assert search in content, "end section not found!"
content = content.replace(search, replace, 1)

with open(r'D:\workspace\emergence-world\src\components\UI\StatsOverlay.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('StatsOverlay updated successfully')
