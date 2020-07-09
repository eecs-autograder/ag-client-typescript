import { ID } from './base';
import { HttpClient, HttpResponse, ProgressEventListener } from './http_client';
import { filter_keys, safe_assign } from './utils';

export class SandboxDockerImageData {
    pk: ID;
    display_name: string;
    course: ID | null;
    last_modified: string;

    constructor(args: SandboxDockerImageData) {
        this.pk = args.pk;
        this.display_name = args.display_name;
        this.course = args.course;
        this.last_modified = args.last_modified;
    }
}

export class SandboxDockerImage extends SandboxDockerImageData {
    static async get_images(course_id: ID | null): Promise<SandboxDockerImage[]> {
        let response = await HttpClient.get_instance().get<SandboxDockerImageData[]>(
            SandboxDockerImage._get_images_url(course_id)
        );
        return response.data.map(item => new SandboxDockerImage(item));
    }

    static async create_image(
        files: File[], course_id: ID | null, on_upload_progress?: ProgressEventListener
    ): Promise<BuildSandboxDockerImageTask> {
        let form_data = new FormData();
        for (let file of files) {
            form_data.append('files', file, file.name);
        }
        let response = await HttpClient.get_instance().post<BuildSandboxDockerImageTaskData>(
            SandboxDockerImage._get_images_url(course_id), form_data,
            {on_upload_progress: on_upload_progress}
        );
        return new BuildSandboxDockerImageTask(response.data);
    }

    private static _get_images_url(course_id: ID | null): string {
        return course_id === null
            ? '/sandbox_docker_images/'
            : `/courses/${course_id}/sandbox_docker_images/`;
    }

    static async get_by_pk(image_pk: ID): Promise<SandboxDockerImage> {
        let response = await HttpClient.get_instance().get<SandboxDockerImageData>(
            `/sandbox_docker_images/${image_pk}/`
        );
        return new SandboxDockerImage(response.data);
    }

    async save(): Promise<void> {
        let response = await HttpClient.get_instance().patch<SandboxDockerImageData>(
            `/sandbox_docker_images/${this.pk}/`,
            filter_keys(this, SandboxDockerImage.EDITABLE_FIELDS)
        );
        safe_assign(this, response.data);
    }

    static readonly EDITABLE_FIELDS: (keyof SandboxDockerImageData)[] = [
        'display_name',
    ];

    async rebuild(
        files: File[], on_upload_progress?: ProgressEventListener
    ): Promise<BuildSandboxDockerImageTask> {
        let form_data = new FormData();
        for (let file of files) {
            form_data.append('files', file, file.name);
        }
        let response = await HttpClient.get_instance().put<BuildSandboxDockerImageTaskData>(
            `/sandbox_docker_images/${this.pk}/rebuild/`, form_data,
            {on_upload_progress: on_upload_progress}
        );
        return new BuildSandboxDockerImageTask(response.data);
    }

    delete(): Promise<HttpResponse> {
        return HttpClient.get_instance().delete(`/sandbox_docker_images/${this.pk}/`);
    }
}

export class BuildSandboxDockerImageTaskData {
    pk: ID;
    created_at: string;
    status: BuildImageStatus;
    return_code: number | null;
    timed_out: boolean;
    filenames: string[];
    course_id: ID | null;
    image: SandboxDockerImageData | null;
    validation_error_msg: string;
    internal_error_msg: string;

    constructor(args: BuildSandboxDockerImageTaskData) {
        this.pk = args.pk;
        this.created_at = args.created_at;
        this.status = args.status;
        this.return_code = args.return_code;
        this.timed_out = args.timed_out;
        this.filenames = args.filenames;
        this.course_id = args.course_id;
        this.image = args.image;
        this.validation_error_msg = args.validation_error_msg;
        this.internal_error_msg = args.internal_error_msg;
    }
}

export class BuildSandboxDockerImageTask extends BuildSandboxDockerImageTaskData {
    static async get_build_tasks(course_id: ID | null): Promise<BuildSandboxDockerImageTask[]> {
        let url = course_id === null
            ? '/image_build_tasks/' : `/courses/${course_id}/image_build_tasks/`;

        let response = await HttpClient.get_instance().get<BuildSandboxDockerImageTaskData[]>(url);
        return response.data.map(item => new BuildSandboxDockerImageTask(item)).sort(
            (first, second) => second.pk - first.pk
        );
    }

    static async get_by_pk(pk: ID): Promise<BuildSandboxDockerImageTask> {
        let response = await HttpClient.get_instance().get<BuildSandboxDockerImageTaskData>(
            `/image_build_tasks/${pk}/`,
        );
        return new BuildSandboxDockerImageTask(response.data);
    }

    async get_output(on_download_progress?: ProgressEventListener): Promise<Blob> {
        let response = await HttpClient.get_instance().get_file(
            `/image_build_tasks/${this.pk}/output/`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }

    async cancel(): Promise<void> {
        let response = await HttpClient.get_instance().post<BuildSandboxDockerImageTaskData>(
            `/image_build_tasks/${this.pk}/cancel/`
        );
        safe_assign(this, response.data);
    }

    async get_files(on_download_progress?: ProgressEventListener): Promise<Blob> {
        let response = await HttpClient.get_instance().get_file(
            `/image_build_tasks/${this.pk}/files/`,
            {on_download_progress: on_download_progress}
        );
        return response.data;
    }
}

export enum BuildImageStatus {
    queued = 'queued',
    in_progress = 'in_progress',
    done = 'done',
    failed = 'failed',
    image_invalid = 'image_invalid',
    cancelled = 'cancelled',
    internal_error = 'internal_error',
}
