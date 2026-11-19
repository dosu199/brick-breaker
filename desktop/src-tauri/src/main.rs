// no console window behind the game in release builds on Windows
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    brick_breaker_lib::run()
}
