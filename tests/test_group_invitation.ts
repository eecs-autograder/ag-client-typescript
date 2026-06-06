import { Course, Group, GroupInvitation, GroupObserver, Project, User } from "..";

import {
    global_setup,
    make_superuser,
    reset_db,
    run_in_django_shell,
    SUPERUSER_NAME
} from "./utils";

beforeAll(() => {
    global_setup();
});

test('Group invitation ctor', () => {
    let sender = new User({
        pk: 3, username: 'batman@umich.edu',
        first_name: 'Bat', last_name: 'Man',
        is_superuser: true
    });
    let recipients = [
        new User({
            pk: 7, username: 'robin@umich.edu',
            first_name: 'Ro', last_name: 'Bin',
            is_superuser: false
        }),
        new User({
            pk: 4, username: 'alfred@umich.edu',
            first_name: 'Al', last_name: 'Fred',
            is_superuser: true
        })
    ];
    let invitation = new GroupInvitation({
        pk: 3,
        project: 6,
        sender: sender,
        recipients: recipients,
        sender_username: sender.username,
        recipient_usernames: recipients.map(recipient => recipient.username),
        recipients_who_accepted: ['robin@umich.edu'],
    });
    expect(invitation.pk).toEqual(3);
    expect(invitation.sender_username).toEqual('batman@umich.edu');
    expect(invitation.project).toEqual(6);
    expect(invitation.recipient_usernames).toEqual(['robin@umich.edu', 'alfred@umich.edu']);
    expect(invitation.recipients_who_accepted).toEqual(['robin@umich.edu']);
});

// For making sure notify_group_created is called when accepting an invitation
// causes a group to be created.
class TestGroupObserver implements GroupObserver {
    group_created: Group | null = null;

    update_group_created(group: Group): void {
        this.group_created = group;
    }

    update_group_changed(group: Group): void {}
    update_group_merged(new_group: Group, group1_pk: number, group2_pk: number): void {}
}

describe('Group invitation tests', () => {
    let project: Project;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        let course = await Course.create({name: 'Coursey'});
        project = await Project.create(course.pk, {name: 'Projy', max_group_size: 3});

        let make_users = `
from django.contrib.auth.models import User
from autograder.core.models import Course

User.objects.create(username='user1')
User.objects.create(username='user2')

Course.objects.get(pk=${course.pk}).admins.add(*User.objects.all())
        `;
        run_in_django_shell(make_users);
    });

    test('Send group invitation', async () => {
        let invitation = await GroupInvitation.send_invitation(project.pk, ['user1', 'user2']);
        expect(invitation.sender_username).toEqual(SUPERUSER_NAME);
        expect(invitation.project).toEqual(project.pk);
        expect(invitation.recipient_usernames).toEqual(['user1', 'user2']);
        expect(invitation.recipients_who_accepted).toEqual([]);

        let loaded = await GroupInvitation.get_by_pk(invitation.pk);
        expect(loaded.sender_username).toEqual(SUPERUSER_NAME);
        expect(loaded.project).toEqual(project.pk);
        expect(loaded.recipient_usernames).toEqual(['user1', 'user2']);
        expect(loaded.recipients_who_accepted).toEqual([]);
    });

    test('Accept group invitation others pending', async () => {
        let make_invitation = `
from django.contrib.auth.models import User
from autograder.core.models import GroupInvitation, Project

invitor = User.objects.get(username='user1')
invitees = User.objects.exclude(pk=invitor.pk)

invitation = GroupInvitation.objects.validate_and_create(
    project=Project.objects.get(pk=${project.pk}),
    sender=invitor,
    recipients=invitees
)

print(invitation.pk)
        `;
        let result = run_in_django_shell(make_invitation);
        let invitation = await GroupInvitation.get_by_pk(parseInt(result.stdout, 10));
        expect(invitation.recipients_who_accepted).toEqual([]);
        expect(invitation.recipient_usernames).toContain(SUPERUSER_NAME);

        let observer = new TestGroupObserver();
        Group.subscribe(observer);
        let new_group = await invitation.accept();
        expect(new_group).toBeNull();

        expect(observer.group_created).toBeNull();
        expect(invitation.recipients_who_accepted).toEqual([SUPERUSER_NAME]);
    });

    test('Accept group invitation group created', async () => {
        let make_invitation = `
from django.contrib.auth.models import User
from autograder.core.models import GroupInvitation, Project

invitor = User.objects.get(username='user1')
invitee = User.objects.get(username='${SUPERUSER_NAME}')

invitation = GroupInvitation.objects.validate_and_create(
    project=Project.objects.get(pk=${project.pk}),
    sender=invitor,
    recipients=[invitee]
)

print(invitation.pk)
        `;
        let result = run_in_django_shell(make_invitation);
        let invitation = await GroupInvitation.get_by_pk(parseInt(result.stdout, 10));
        expect(invitation.recipients_who_accepted).toEqual([]);
        expect(invitation.recipient_usernames).toEqual([SUPERUSER_NAME]);

        let observer = new TestGroupObserver();
        Group.subscribe(observer);
        let new_group = await invitation.accept();
        expect(new_group).not.toBeNull();
        expect(observer.group_created).toEqual(new_group);

        expect(new_group!.member_names).toEqual([SUPERUSER_NAME, 'user1']);
    });

    test('Refresh group invitation', async () => {
        let invitation = await GroupInvitation.send_invitation(project.pk, ['user1', 'user2']);
        let user_accept = `
from django.contrib.auth.models import User
from autograder.core.models import GroupInvitation

invitation = GroupInvitation.objects.get(pk=${invitation.pk})
accepter = User.objects.get(username='user1')

invitation.recipient_accept(accepter)
        `;
        run_in_django_shell(user_accept);

        expect(invitation.recipients_who_accepted).toEqual([]);
        await invitation.refresh();
        expect(invitation.recipients_who_accepted).toEqual(['user1']);
    });

    test('Reject invitation', async () => {
        let make_invitation = `
from django.contrib.auth.models import User
from autograder.core.models import GroupInvitation, Project

invitor = User.objects.get(username='user1')
invitees = User.objects.exclude(pk=invitor.pk)

invitation = GroupInvitation.objects.validate_and_create(
    project=Project.objects.get(pk=${project.pk}),
    sender=invitor,
    recipients=invitees
)

print(invitation.pk)
        `;
        let result = run_in_django_shell(make_invitation);
        let invitation = await GroupInvitation.get_by_pk(parseInt(result.stdout, 10));
        expect(invitation.recipients_who_accepted).toEqual([]);
        expect(invitation.recipient_usernames).toContain(SUPERUSER_NAME);

        await invitation.reject();

        try {
            await invitation.refresh();
            fail('404 error not thrown');
        }
        catch (e) {
            expect(e.status).toEqual(404);
        }
    });
});
