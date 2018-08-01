import { User } from "src/user";

import { reset_db, run_in_django_shell } from "./manage_server";
import { global_setup } from "./setup";

beforeAll(() => {
    global_setup();
});

beforeEach(() => {
    reset_db();
});

test('get current user', async () => {
    // await reset_db();
    let current_user = await User.get_current();
    expect(current_user.username).toBe('jameslp@umich.edu');
    expect(current_user.first_name).toBe('');
    expect(current_user.last_name).toBe('');
    expect(current_user.email).toBe('');
    expect(current_user.is_superuser).toBe(false);

    let set_superuser = `
from django.contrib.auth.models import User
User.objects.filter(pk=${current_user.pk}).update(is_superuser=True)
    `;
    run_in_django_shell(set_superuser);

    current_user = await User.get_current();
    expect(current_user.username).toBe('jameslp@umich.edu');
    expect(current_user.first_name).toBe('');
    expect(current_user.last_name).toBe('');
    expect(current_user.email).toBe('');
    expect(current_user.is_superuser).toBe(true);
});

test('get user by pk', async () => {
    let current_user = await User.get_current();
    let set_superuser = `
from django.contrib.auth.models import User
User.objects.filter(pk=${current_user.pk}).update(is_superuser=True)`;
    run_in_django_shell(set_superuser);

    let user = await User.get_by_pk(current_user.pk);
    expect(user.is_superuser).toBe(true);
});

test('user by pk not found', async () => {
    fail();
});

test('refresh user', async () => {
    fail();
});

test.skip('get courses is admin for', async () => {
    fail();
});

test.skip('get courses is staff for', async () => {
    fail();
});

test.skip('get courses is student in', async () => {
    fail();
});

test.skip('get courses is handgrader for', async () => {
    fail();
});

test.skip('group invitations received', async () => {
    fail();
});

test.skip('group invitations sent', async () => {
    fail();
});

test.skip('groups is member of', async () => {
    fail();
});
