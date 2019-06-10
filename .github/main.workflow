workflow "Build, Lint and Test" {
  on = "push"
  resolves = ["Lint", "Test"]
}

action "Build" {
  uses = "Borales/actions-yarn@master"
  args = "install"
}

action "Lint" {
  uses = "Borales/actions-yarn@master"
  args = "lint"
}

action "Test" {
  needs = "Build"
  uses = "Borales/actions-yarn@master"
  args = "test"
}
