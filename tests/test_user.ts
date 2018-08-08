import { User } from "src/user";

import { global_setup, reset_db, run_in_django_shell } from "./utils";

describe('User tests', () => {
    beforeAll(() => {
        global_setup();
    });

    beforeEach(() => {
        reset_db();
    });

    test('constructor', async () => {
        let user = new User({
            pk: 42,
            username: 'batman',
            first_name: 'The',
            last_name: 'Batman',
            email: 'batman@umich.edu',
            is_superuser: true
        });
        expect(user.pk).toEqual(42);
        expect(user.username).toEqual('batman');
        expect(user.first_name).toEqual('The');
        expect(user.last_name).toEqual('Batman');
        expect(user.email).toEqual('batman@umich.edu');
        expect(user.is_superuser).toEqual(true);
    });

    test('get current user', async () => {
        let current_user = await User.get_current();
        expect(current_user.username).toEqual('jameslp@umich.edu');
        expect(current_user.first_name).toEqual('');
        expect(current_user.last_name).toEqual('');
        expect(current_user.email).toEqual('');
        expect(current_user.is_superuser).toEqual(false);

        let set_superuser = `
from django.contrib.auth.models import User
User.objects.filter(pk=${current_user.pk}).update(is_superuser=True)`;
        run_in_django_shell(set_superuser);

        current_user = await User.get_current();
        expect(current_user.username).toEqual('jameslp@umich.edu');
        expect(current_user.first_name).toEqual('');
        expect(current_user.last_name).toEqual('');
        expect(current_user.email).toEqual('');
        expect(current_user.is_superuser).toEqual(true);
    });

    test('get user by pk', async () => {
        let current_user = await User.get_current();
        let set_superuser = `
from django.contrib.auth.models import User
User.objects.filter(pk=${current_user.pk}).update(is_superuser=True)`;
        run_in_django_shell(set_superuser);

        let user = await User.get_by_pk(current_user.pk);
        expect(user.is_superuser).toEqual(true);
    });

    test('user by pk not found', async () => {
        return expect(
            User.get_by_pk(10000)
        ).rejects.toHaveProperty('response.status', 404);
    });

    test('refresh user', async () => {
        let user = await User.get_current();
        expect(user.username).toEqual('jameslp@umich.edu');
        expect(user.first_name).toEqual('');
        expect(user.last_name).toEqual('');
        expect(user.email).toEqual('');
        expect(user.is_superuser).toEqual(false);

        let set_fields = `
from django.contrib.auth.models import User
User.objects.filter(pk=${user.pk}).update(
    is_superuser=True,
    first_name='James',
    last_name='Perretta',
    email='jameslp@umich.edu')`;
        run_in_django_shell(set_fields);

        await user.refresh();
        expect(user.username).toEqual('jameslp@umich.edu');
        expect(user.first_name).toEqual('James');
        expect(user.last_name).toEqual('Perretta');
        expect(user.email).toEqual('jameslp@umich.edu');
        expect(user.is_superuser).toEqual(true);
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

});
