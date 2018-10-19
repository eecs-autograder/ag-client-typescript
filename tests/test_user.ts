import { Course, Semester } from "src/course";
import { User } from "src/user";

import { global_setup, make_superuser, reset_db, run_in_django_shell } from "./utils";


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

    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------

    test('get user by pk', async () => {
        let current_user = await User.get_current();
        let set_superuser = `
from django.contrib.auth.models import User
User.objects.filter(pk=${current_user.pk}).update(is_superuser=True)`;
        run_in_django_shell(set_superuser);

        let user = await User.get_by_pk(current_user.pk);
        expect(user.is_superuser).toEqual(true);
    });

    // ------------------------------------------------------------------------

    test('user by pk not found', async () => {
        return expect(
            User.get_by_pk(10000)
        ).rejects.toHaveProperty('response.status', 404);
    });

    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------

    test('Get current user roles for course, all roles false', async () => {
        let make_course = `
from autograder.core.models import Course, Semester
c = Course.objects.validate_and_create(name='course', semester=Semester.fall, year=2020)
        `;
        run_in_django_shell(make_course);
        let course = await Course.get_by_fields('course', Semester.fall, 2020);

        let roles = await User.get_current_user_roles(course.pk);
        expect(roles.is_admin).toBe(false);
        expect(roles.is_staff).toBe(false);
        expect(roles.is_student).toBe(false);
        expect(roles.is_handgrader).toBe(false);
    });

    // ------------------------------------------------------------------------

    test('Get current user roles for course, all roles true', async () => {
        make_superuser();

        let make_course = `
from autograder.core.models import Course, Semester
from django.contrib.auth.models import User
c = Course.objects.validate_and_create(name='course', semester=Semester.fall, year=2020)
user = User.objects.get(username='jameslp@umich.edu')
c.admins.add(user)
c.staff.add(user)
c.students.add(user)
c.handgraders.add(user)
        `;
        run_in_django_shell(make_course);
        let course = await Course.get_by_fields('course', Semester.fall, 2020);

        let roles = await User.get_current_user_roles(course.pk);
        expect(roles.is_admin).toBe(true);
        expect(roles.is_staff).toBe(true);
        expect(roles.is_student).toBe(true);
        expect(roles.is_handgrader).toBe(true);
    });
});

// ----------------------------------------------------------------------------

describe('User reverse relation ship endpoint tests', () => {
    beforeEach(() => {
        reset_db();
    });

    test('get courses is admin for', async () => {
        make_superuser();
        let add_admins = `
from autograder.core.models import Course
from django.contrib.auth.models import User

Course.objects.bulk_create([
    Course(name='course1'),
    Course(name='course2'),
    Course(name='course3'),
])

user = User.objects.get(username='jameslp@umich.edu')
for c in Course.objects.all():
    c.admins.add(user)
        `;
        run_in_django_shell(add_admins);

        let user = await User.get_current();
        let courses = await user.courses_is_admin_for();
        let course_names = courses.map(course => course.name);
        expect(course_names).toEqual(['course1', 'course2', 'course3']);
    });

    // ------------------------------------------------------------------------

    test('get courses is staff for', async () => {
        make_superuser();
        let add_staff = `
from autograder.core.models import Course
from django.contrib.auth.models import User

Course.objects.bulk_create([
    Course(name='course1'),
    Course(name='course2'),
    Course(name='course3'),
])

user = User.objects.get(username='jameslp@umich.edu')
for c in Course.objects.all():
    c.staff.add(user)
        `;
        run_in_django_shell(add_staff);

        let user = await User.get_current();
        let courses = await user.courses_is_staff_for();
        let course_names = courses.map(course => course.name);
        expect(course_names).toEqual(['course1', 'course2', 'course3']);
    });

    // ------------------------------------------------------------------------

    test('get courses is student in', async () => {
        make_superuser();
        let add_students = `
from autograder.core.models import Course
from django.contrib.auth.models import User

Course.objects.bulk_create([
    Course(name='course1'),
    Course(name='course2'),
    Course(name='course3'),
])

user = User.objects.get(username='jameslp@umich.edu')
for c in Course.objects.all():
    c.students.add(user)
        `;
        run_in_django_shell(add_students);

        let user = await User.get_current();
        let courses = await user.courses_is_student_in();
        let course_names = courses.map(course => course.name);
        expect(course_names).toEqual(['course1', 'course2', 'course3']);
    });

    // ------------------------------------------------------------------------

    test('get courses is handgrader for', async () => {
        make_superuser();
        let add_handgraders = `
from autograder.core.models import Course
from django.contrib.auth.models import User

Course.objects.bulk_create([
    Course(name='course1'),
    Course(name='course2'),
    Course(name='course3'),
])

user = User.objects.get(username='jameslp@umich.edu')
for c in Course.objects.all():
    c.handgraders.add(user)
        `;
        run_in_django_shell(add_handgraders);

        let user = await User.get_current();
        let courses = await user.courses_is_handgrader_for();
        let course_names = courses.map(course => course.name);
        expect(course_names).toEqual(['course1', 'course2', 'course3']);
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
