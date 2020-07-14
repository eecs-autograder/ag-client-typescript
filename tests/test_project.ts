import {
    Course,
    ExpectedStudentFile,
    HttpError,
    InstructorFile,
    NewProjectData,
    Project,
    ProjectObserver,
    UltimateSubmissionPolicy
} from '..';

import { do_editable_fields_test, expect_dates_equal, global_setup, make_superuser,
         reset_db, run_in_django_shell, sleep } from './utils';

beforeAll(() => {
    global_setup();
});

describe('Project ctor tests', () => {
    test('Construct Project', () => {
        let now = (new Date()).toISOString();
        let instructor_files = [
            // Should work with InstructorFileData and InstructorFile
            {
                pk: 100,
                project: 42,
                name: 'spam',
                size: 4300,
                last_modified: ''
            },
            // Should work with InstructorFileData and InstructorFile
            new InstructorFile({
                pk: 101,
                project: 42,
                name: 'spam',
                size: 4300,
                last_modified: ''
            })
        ];
        let expected_student_files = [
            // Should work with ExpectedStudentFileData and ExpectedStudentFile
            {
                pk: 300,
                project: 42,
                pattern: 'spam',
                min_num_matches: 1,
                max_num_matches: 1,
                last_modified: ''
            },
            // Should work with ExpectedStudentFileData and ExpectedStudentFile
            new ExpectedStudentFile({
                pk: 300,
                project: 42,
                pattern: 'spam',
                min_num_matches: 1,
                max_num_matches: 1,
                last_modified: ''
            })
        ];
        let project = new Project({
            pk: 42,
            name: 'project',
            last_modified: now,
            course: 43,
            visible_to_students: true,
            closing_time: null,
            soft_closing_time: null,
            disallow_student_submissions: false,
            disallow_group_registration: false,
            guests_can_submit: true,
            min_group_size: 1,
            max_group_size: 3,

            submission_limit_per_day: 2,
            allow_submissions_past_limit: true,
            groups_combine_daily_submissions: false,
            submission_limit_reset_time: '0:00',
            submission_limit_reset_timezone: 'UTC',

            num_bonus_submissions: 0,

            total_submission_limit: null,

            allow_late_days: true,

            ultimate_submission_policy: UltimateSubmissionPolicy.best,
            hide_ultimate_submission_fdbk: true,

            instructor_files: instructor_files,
            expected_student_files: expected_student_files,

            has_handgrading_rubric: true
        });

        expect(project.pk).toEqual(42);
        expect(project.name).toEqual('project');
        expect(project.last_modified).toEqual(now);
        expect(project.course).toEqual(43);
        expect(project.visible_to_students).toEqual(true);
        expect(project.closing_time).toEqual(null);
        expect(project.soft_closing_time).toEqual(null);
        expect(project.disallow_student_submissions).toEqual(false);
        expect(project.disallow_group_registration).toEqual(false);
        expect(project.guests_can_submit).toEqual(true);
        expect(project.min_group_size).toEqual(1);
        expect(project.max_group_size).toEqual(3);

        expect(project.submission_limit_per_day).toEqual(2);
        expect(project.allow_submissions_past_limit).toEqual(true);
        expect(project.groups_combine_daily_submissions).toEqual(false);
        expect(project.submission_limit_reset_time).toEqual('0:00');
        expect(project.submission_limit_reset_timezone).toEqual('UTC');

        expect(project.num_bonus_submissions).toEqual(0);

        expect(project.total_submission_limit).toEqual(null);

        expect(project.allow_late_days).toEqual(true);

        expect(project.ultimate_submission_policy).toEqual(UltimateSubmissionPolicy.best);
        expect(project.hide_ultimate_submission_fdbk).toEqual(true);

        expect(project.instructor_files).toEqual(
            [new InstructorFile(instructor_files[0]), instructor_files[1]]);
        expect(project.expected_student_files).toEqual(
            [new ExpectedStudentFile(expected_student_files[0]), expected_student_files[1]]);

        expect(project.has_handgrading_rubric).toEqual(true);
    });

    test('Construct project without closing time or instructor files', () => {
        let project = new Project({
            pk: 42,
            name: 'project',
            last_modified: '',
            course: 43,
            visible_to_students: true,
            soft_closing_time: null,

            disallow_student_submissions: false,
            disallow_group_registration: false,
            guests_can_submit: true,
            min_group_size: 1,
            max_group_size: 3,
            submission_limit_per_day: 2,
            allow_submissions_past_limit: true,
            groups_combine_daily_submissions: false,
            submission_limit_reset_time: '0:00',
            submission_limit_reset_timezone: 'UTC',
            num_bonus_submissions: 0,
            total_submission_limit: null,
            allow_late_days: true,
            ultimate_submission_policy: UltimateSubmissionPolicy.best,
            hide_ultimate_submission_fdbk: true,
            expected_student_files: [],
            has_handgrading_rubric: false,
        });

        expect(project.closing_time).toBeUndefined();
        expect(project.instructor_files).toBeUndefined();
    });
});

class TestObserver implements ProjectObserver {
    project: Project | null = null;

    created_count = 0;
    changed_count = 0;

    update_project_changed(project: Project): void {
        this.changed_count += 1;
        this.project = project;
    }

    update_project_created(project: Project): void {
        this.created_count += 1;
        this.project = project;
    }
}

describe('Project API tests', () => {
    let course: Course;
    let observer: TestObserver;

    beforeEach(async () => {
        reset_db();
        make_superuser();
        course = await Course.create({name: 'Coursey'});

        let make_projects = `
from autograder.core.models import Project
Project.objects.validate_and_create(course=${course.pk}, name='Project1')
Project.objects.validate_and_create(course=${course.pk}, name='Project2')
        `;
        run_in_django_shell(make_projects);

        observer = new TestObserver();
        Project.subscribe(observer);
    });

    test('Get projects from course', async () => {
        let projects = await Project.get_all_from_course(course.pk);
        expect(projects[0].name).toEqual('Project1');
        expect(projects[1].name).toEqual('Project2');
    });

    test('Get projects from course none exist', async () => {
        let delete_projects = `
from autograder.core.models import Project
Project.objects.all().delete()
        `;
        run_in_django_shell(delete_projects);

        let projects = await Project.get_all_from_course(course.pk);
        expect(projects).toEqual([]);
    });

    test('Get project by pk', async () => {
        let projects = await Project.get_all_from_course(course.pk);
        let project = await Project.get_by_pk(projects[0].pk);
        expect(project.name).toEqual('Project1');
    });

    test('Create project all params', async () => {
        let now = new Date();
        let data = new NewProjectData({
            name: 'project',
            visible_to_students: true,
            soft_closing_time: now.toISOString(),
            closing_time: now.toISOString(),

            disallow_student_submissions: false,
            disallow_group_registration: false,
            guests_can_submit: true,
            min_group_size: 1,
            max_group_size: 3,
            submission_limit_per_day: 2,
            allow_submissions_past_limit: true,
            groups_combine_daily_submissions: false,
            submission_limit_reset_time: '00:00:00',
            submission_limit_reset_timezone: 'UTC',
            num_bonus_submissions: 0,
            total_submission_limit: null,
            allow_late_days: true,
            ultimate_submission_policy: UltimateSubmissionPolicy.best,
            hide_ultimate_submission_fdbk: true,
        });

        let project = await Project.create(course.pk, data);
        expect(project.name).toEqual('project');
        expect(project.course).toEqual(course.pk);
        expect(project.visible_to_students).toEqual(true);

        now.setSeconds(0, 0);
        expect_dates_equal(project.soft_closing_time, now.toISOString());
        expect_dates_equal(project.closing_time!, now.toISOString());

        expect(project.disallow_student_submissions).toEqual(false);
        expect(project.disallow_group_registration).toEqual(false);
        expect(project.guests_can_submit).toEqual(true);
        expect(project.min_group_size).toEqual(1);
        expect(project.max_group_size).toEqual(3);
        expect(project.submission_limit_per_day).toEqual(2);
        expect(project.allow_submissions_past_limit).toEqual(true);
        expect(project.groups_combine_daily_submissions).toEqual(false);
        expect(project.submission_limit_reset_time).toEqual('00:00:00');
        expect(project.submission_limit_reset_timezone).toEqual('UTC');
        expect(project.num_bonus_submissions).toEqual(0);
        expect(project.total_submission_limit).toEqual(null);
        expect(project.allow_late_days).toEqual(true);
        expect(project.ultimate_submission_policy).toEqual(UltimateSubmissionPolicy.best);
        expect(project.hide_ultimate_submission_fdbk).toEqual(true);

        let projects = await Project.get_all_from_course(course.pk);
        expect(projects.length).toEqual(3);

        expect(project).toEqual(observer.project);
        expect(observer.created_count).toEqual(1);
    });

    test('Create project only required params', async () => {
        let data = new NewProjectData({
            name: 'project',
        });
        let project = await Project.create(course.pk, data);
        expect(project.name).toEqual('project');
        expect(project.course).toEqual(course.pk);
        expect(project.visible_to_students).toEqual(false);
        expect(project.soft_closing_time).toEqual(null);
        expect(project.closing_time).toEqual(null);

        let projects = await Project.get_all_from_course(course.pk);
        expect(projects.length).toEqual(3);
    });

    test('Save project', async () => {
        let data = {
            name: 'project',
            course: course.pk
        };
        let project = await Project.create(course.pk, data);
        expect(project.name).toEqual('project');
        expect(project.course).toEqual(course.pk);
        expect(project.visible_to_students).toEqual(false);

        project.name = 'Projamas';
        project.visible_to_students = true;
        await project.save();
        expect(project.name).toEqual('Projamas');
        expect(project.visible_to_students).toEqual(true);

        let reloaded = await Project.get_by_pk(project.pk);
        expect(reloaded.name).toEqual('Projamas');
        expect(reloaded.visible_to_students).toEqual(true);

        expect(observer.project).toEqual(project);
        expect(observer.changed_count).toEqual(1);
    });

    test('Check editable fields', async () => {
        do_editable_fields_test(Project, 'Project');
    });

    test('Refresh project', async () => {
        let project = await Project.create(course.pk, {name: 'project'});

        await project.refresh();
        expect(observer.changed_count).toEqual(0);

        await sleep(1);

        let rename_project = `
from autograder.core.models import Project
project = Project.objects.get(pk=${project.pk});
project.validate_and_update(name='projy')
        `;

        run_in_django_shell(rename_project);

        await project.refresh();
        expect(project.name).toEqual('projy');

        expect(observer.project).toEqual(project);
        expect(observer.changed_count).toEqual(1);
    });

    test('Delete project', async () => {
        let project = await Project.create(course.pk, {name: 'project'});
        await project.delete();

        try {
            await project.refresh();
            fail('exception not thrown');
        }
        catch (e) {
            if (!(e instanceof HttpError)) {
                throw e;
            }
            expect(e.status).toEqual(404);
        }
    });

    test('Copy project to same course', async () => {
        let project = await Project.create(course.pk, {name: 'project'});

        let new_project = await project.copy_to_course(project.course, 'clone');
        expect(new_project.name).toEqual('clone');
        expect(new_project.course).toEqual(course.pk);

        await new_project.refresh();
        expect(new_project.name).toEqual('clone');
        expect(new_project.course).toEqual(course.pk);

        let projects = await Project.get_all_from_course(course.pk);
        expect(projects.length).toEqual(4);

        expect(observer.project).toEqual(new_project);
        expect(observer.created_count).toEqual(2);
    });

    test('Copy project to new course', async () => {
        let project = await Project.create(course.pk, {name: 'project'});

        let new_course = await Course.create({name: 'New course'});

        let new_project = await project.copy_to_course(new_course.pk, 'clone');
        expect(new_project.name).toEqual('clone');
        expect(new_project.course).toEqual(new_course.pk);

        expect((await Project.get_all_from_course(course.pk)).length).toEqual(3);
        expect((await Project.get_all_from_course(new_course.pk)).length).toEqual(1);

        expect(observer.project).toEqual(new_project);
        expect(observer.created_count).toEqual(2);
    });

    test('Num queued submissions', async () => {
        let project = await Project.create(course.pk, {name: 'project'});
        let num_queued = await project.num_queued_submissions();
        expect(num_queued).toEqual(0);

        let queue_submissions = `
from django.contrib.auth.models import User
from autograder.core.models import Project, Group, Submission
p = Project.objects.get(pk=${project.pk})
g = Group.objects.validate_and_create(project=p, members=[User.objects.first()])
s = Submission.objects.validate_and_create(group=g, submitted_files=[])
s.status = Submission.GradingStatus.queued
s.save()
        `;

        run_in_django_shell(queue_submissions);

        num_queued = await project.num_queued_submissions();
        expect(num_queued).toEqual(1);
    });

    test('Unsubscribe', async () => {
        let project = await Project.create(course.pk, {name: 'Projy'});

        expect(observer.project).toEqual(project);
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);

        Project.unsubscribe(observer);

        await project.save();
        expect(observer.created_count).toEqual(1);
        expect(observer.changed_count).toEqual(0);
    });
});
